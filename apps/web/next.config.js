//@ts-check

const { join } = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace libs are consumed as TS source — Next must transpile them
  // (and dedupe React) rather than treat them as pre-built deps.
  transpilePackages: ['@rafiandria23/h3-zoom-test-api-client'],

  // Self-contained server for the Docker runtime image (apps/web/Dockerfile).
  // Trace from the workspace root so the monorepo layout is preserved.
  output: 'standalone',
  outputFileTracingRoot: join(__dirname, '../..'),
};

module.exports = nextConfig;
