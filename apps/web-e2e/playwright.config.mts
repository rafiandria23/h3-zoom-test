import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// The web app's origin. Use 127.0.0.1 (not localhost): the API's CORS
// allowlist is built from WEB_SCHEME/WEB_HOST/WEB_PORT, which default to
// http://127.0.0.1:4000. CI points BASE_URL at the docker compose stack.
const baseURL = process.env['BASE_URL'] || 'http://127.0.0.1:4000';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Generated as a .mts file so Node forces ESM regardless of workspace
 * `type`. Playwright routes `.mts` through its ESM loader (dynamic import,
 * bypassing the pirates CJS-compile path), and Nx's native TS strip loads
 * `.mts` directly. Playwright's configLoader auto-discovers
 * `playwright.config.mts` via its extension list
 * (.ts/.js/.mts/.mjs/.cts/.cjs).
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // The specs submit items, so the API (and its Postgres/Redis) must be up
  // too — `docker compose up -d --wait api` locally, or the full stack in CI.
  // This only starts the web dev server when nothing is serving baseURL yet.
  webServer: {
    command: 'yarn nx run @rafiandria23/h3-zoom-test-web:dev',
    url: baseURL,
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
