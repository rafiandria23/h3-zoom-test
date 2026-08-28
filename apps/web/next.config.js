//@ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace libs are consumed as TS source — Next must transpile them
  // (and dedupe React) rather than treat them as pre-built deps.
  transpilePackages: ['@rafiandria23/h3-zoom-test-api-client'],
};

module.exports = nextConfig;
