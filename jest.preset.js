const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  // Nx's preset only emits the HTML report. Add lcov.info for SonarCloud, with
  // paths relative to the workspace root (this file's dir) so every project's
  // report resolves unambiguously from the repo root.
  coverageReporters: [
    ...nxPreset.coverageReporters,
    ['lcovonly', { projectRoot: __dirname }],
  ],
};
