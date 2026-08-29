# TH-2 — Improvement Plan (Analysis)

> A separate take-home task, kept here for reference. Unrelated to the H3 Zoom Test app.

## The scenario

A small, **live** SaaS with paying customers, running on:

- a single cloud VM
- no version control
- manual deployments (SSH in, change files, restart)
- no monitoring
- one non-technical owner, no permanent technical staff

## Assumptions (to confirm in discussion)

The brief doesn't name the product, so I assume a typical full-stack SaaS:

- Web frontend + API backend + a relational database, probably a background worker.
- Hosted on a major cloud — I'll say **AWS**; the shape is identical on GCP/Azure/DigitalOcean.
- The database and any user-uploaded files currently sit on the **same VM's disk**.
- Deploys and fixes are done by one contractor/developer; if they're unavailable, nobody else can get in.
- Secrets live in `.env` files on the box.

## How I'm prioritising

Ordered by **risk removed per unit of effort**, with a deliberate bias toward changes that make the ones below them safer. Two tiers:

- **Tier 1 — Stabilise (the top five).** A minimum viable SDLC. ~3–4 weeks of one engineer's time; ~$40–60/month of added infrastructure cost.
- **Tier 2 — Scale-up playbook.** Deferred until a concrete signal (revenue, traffic, a second engineer) justifies the cost and the operational overhead. Summarised at the end — **not** part of the five.

Effort is given as a t-shirt size plus rough calendar time for one engineer.

---

## The plan — top five, in order

| # | Change | Effort | Added cost | Risk removed |
| --- | --- | --- | --- | --- |
| 1 | Put the code in version control (Git + hosted repo + PR checks) | **S** — hours to 1 day | $0 | Total, unrecoverable loss of the codebase; no history, review, or rollback |
| 2 | Make the VM stateless: move database, cache and uploads to managed services | **M** — 1–2 days incl. cutover | ~$35–55/mo | Catastrophic customer-data loss; DB dying with the VM; manual backup/patch burden |
| 3 | Monitoring and alerting | **S–M** — 1–2 days | $0–10/mo | Silent outages; blind resource exhaustion; unseen client-side breakage |
| 4 | Repeatable releases: CI/CD with automated tests + containerised deploy | **M** — 3–5 days | $0 | Deploy-induced outages; "works on my machine"; un-repeatable release steps |
| 5 | Infrastructure as code + secrets management + patching + runbook | **M** — 3–5 days | $0 | The unrebuildable, one-person-only server; config drift; secret leakage; unpatched CVEs |

### 1. Put the code in version control

Today there is a single copy of the software, on the VM. A disk failure, a bad `rm`, or a careless edit loses the product outright — and there is no history, no review, and no way to see what changed or undo it.

Create a Git repository, push it to a private hosted repo (GitHub/GitLab), and commit the current VM state as the baseline. Adopt a lightweight model: trunk with short-lived feature branches, one required pull-request review (a self-review checklist while solo), and CI status checks that must pass before merge — no GitFlow, it's too heavy here.

This is the cheapest item on the list and **every other item depends on it**. Effort: a few hours; up to a day if the working tree on the box needs cleaning up first.

### 2. Make the VM stateless — move state to managed services

The single highest-severity risk in the current setup is the database sharing an unmanaged disk with everything else. Any VM failure, a disk-full event, or a slip during a deploy can destroy customer data with no clean recovery. Move all persistent state off the compute node:

- **Database → managed RDS** (PostgreSQL/MySQL) — buys automated daily backups, point-in-time recovery, managed patching, and one-click restore.
- **Cache / sessions / queue → managed ElastiCache** (Redis).
- **User uploads / assets → object storage (S3).**

Migrate the live database in a short, announced maintenance window — dump/restore for a small database, logical replication if downtime must be near-zero. On top of the managed backups, take a **nightly logical dump to S3** with 30-day retention as defence-in-depth against a replicated bad write or an account compromise, and **rehearse a restore once** so the runbook is real.

Effort: 1–2 days including the cutover. Added cost: roughly $35–55/month (smallest RDS ~$15–25, small ElastiCache ~$12–15, S3 + backups a few dollars). This also makes the VM **disposable**, which is what makes items 4 and 5 safe rather than nerve-wracking.

### 3. Monitoring and alerting

Right now the owner learns about an outage when a customer emails. Put three things in place:

- **Backend/infra metrics and alarms via CloudWatch** — CPU, memory, disk, error rate, RDS connections and storage. CloudWatch is the choice here because it's zero-setup, cheap, and already integrated with the managed services from item 2.
- **An external uptime check** (UptimeRobot / Healthchecks.io free tier) hitting a real health endpoint every minute, so a fully-down box is caught even when it can't report on itself.
- **Frontend error tracking via Sentry's free tier** — CloudWatch has no visibility into client-side JavaScript errors, and the free tier is plenty at this scale.

All alerts go to the owner's phone and to whoever is on call for the code. While here, start recording **request rate and p95 latency** — not to act on yet, but to build the evidence base that later decides whether and when to scale (Tier 2). Effort: 1–2 days.

### 4. Repeatable releases — CI/CD with tests and a containerised deploy

Manual deployment — SSH in, copy files, restart — is slow, done differently every time, and the main cause of self-inflicted downtime. Replace it with a pipeline:

- On every pull request, CI runs the build, unit tests, and integration tests; a red build blocks merge.
- On merge to trunk, CI builds a **versioned container image**, runs a short smoke/e2e check against it, pushes it to a registry, and deploys by pulling the new image tag on the VM and swapping the running container.
- The deploy step runs a health check and **automatically rolls back to the previous image tag** if it fails.

Containerising the app (a Dockerfile per service, run with Docker Compose on the VM for now) is part of this: the artifact becomes identical from laptop to CI to production, and rollback becomes a tag change. This deliberately keeps a **single VM with no orchestration**, but produces an image that drops straight into ECS/Fargate in Tier 2 with no rework. Full end-to-end suites run **nightly and pre-release**, not on every push — a flaky pipeline the solo owner learns to ignore is worse than none. Effort: 3–5 days. CI free tiers are ample at this volume.

### 5. Infrastructure as code + secrets + patching + runbook

The VM is a hand-built artifact that one person understands and nobody can reproduce. If it's lost — or that person becomes unavailable — the business is in serious trouble.

- **Define all infrastructure as Terraform** — the VM, networking/security groups, RDS, ElastiCache, S3, IAM, DNS — checked into the repo, applied per environment. Terraform from day one (not a config-management tool) because the same definitions carry forward **unchanged** into Tier 2 with more resources bolted on, so there's no migration cost later. In-VM setup (install Docker, pull the repo, start Compose) is a minimal cloud-init script.
- **Move secrets out of `.env` files** into SSM Parameter Store / Secrets Manager, injected at container start.
- **Turn on unattended security updates** for the OS.
- **Write a one-page runbook** — how to deploy, how to roll back, how to restore the database, where the credentials live — and put all account and service credentials into a **password manager the owner controls**, so access never depends on one individual.

Effort: 3–5 days.

---

## Tier 2 — scale-up playbook (not part of the five)

Do these when a **specific signal** justifies the spend and the operational overhead, not before:

- **Sustained load or a funded growth plan** → Multi-AZ RDS + read replicas; move the containers from the single VM to **ECS/Fargate** behind a load balancer with blue-green deploys; horizontal autoscaling driven by the request-rate and latency metrics from item 3.
- **A second engineer, or release anxiety** → a permanent staging environment, plus ephemeral per-PR environments.
- **Debugging pain at scale** → APM / distributed tracing (Datadog, New Relic, or OpenTelemetry to a managed backend), upgrading from the item-3 basics.
- **Global users** → a CDN in front of the app and static assets.
- **Compliance / enterprise deals** → audit logging, a formal on-call rotation, SOC 2 groundwork.

**Explicitly out of scope for this business for the foreseeable future:** Kubernetes/EKS and a service mesh. They solve multi-team, many-service coordination problems this product doesn't have. ECS/Fargate is the realistic ceiling and the point where I'd stop adding platform complexity.

---

## Summary for the owner (plain language)

Your product works — but it's running without a safety net. Everything that matters (the software, the customer database, the way updates happen) lives on one rented computer, with no reliable backups, no copy of the code anywhere else, and nothing watching it. If that machine fails, or an update goes wrong, you could lose the product and your customers' data with no quick way back. Here's what I'd do, in order, over about three to four weeks.

**First**, I'd put a proper copy of the software into version control — an online service that keeps every version and every change. Today there's only the single copy on the server. This takes a few hours, costs nothing, and protects the thing your business is built on.

**Second**, I'd move the customer database and uploaded files off that one server onto managed services run by the cloud provider, which come with automatic daily backups and a tested way to restore them. This is the single most important change for protecting customer data. It adds roughly $40–60 a month — think of it as an insurance premium against losing everything.

**Third**, I'd add monitoring: automatic checks that the site is up, alerts sent straight to your phone the moment something breaks, and error reporting from the parts customers actually see. Right now you find out about problems when a customer complains. One to two days of work, nearly free.

**Fourth**, I'd make updates safe and boring. Instead of someone logging in and editing files by hand — the most common cause of outages — updates would go through an automated process that tests each change first and can undo itself instantly if something's wrong. About a week of work, no added cost.

**Fifth**, I'd write the whole server setup down as code, so the entire system can be rebuilt from scratch in about an hour instead of living only in one person's head — and put every password and account login into a shared password manager that **you** control, so you're never locked out of your own product if a contractor moves on. Three to five days.

The order is deliberate: each step makes the next one safer. After these five, the product is on solid footing, and the more ambitious infrastructure — handling big traffic spikes, running multiple servers — can wait until your growth actually calls for it. I've written up separately what that looks like when the time comes.

**Total:** about three to four weeks of engineering time, plus an extra $40–60 a month in running costs, most of it for the managed database.

---

## AI tools used

- **Analysis & drafting** — Claude (Sonnet 5, high reasoning effort) in the Claude Code VS Code extension. The priorities, ordering, and architectural calls in this document are mine, drawn from years of orchestrating services and software delivery. I used the model to pressure-test and enrich each proposal and to draft the prose from that direction, reviewing and approving every point before it went in — the same steer-and-gate workflow described in this repo's README.
