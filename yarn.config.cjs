// Yarn constraints (https://yarnpkg.com/features/constraints), checked in CI
// by `yarn constraints`; `yarn constraints --fix` applies the expected ranges.

module.exports = {
  async constraints({ Yarn }) {
    // Nx core and its plugins must stay on one exact version. Renovate groups
    // them for regular updates, but vulnerability PRs bypass grouping and can
    // bump `nx` alone (as #7 did), so enforce the lockstep here.
    const nx = Yarn.dependency({
      workspace: Yarn.workspace({ cwd: '.' }),
      ident: 'nx',
    });
    if (!nx) {
      return;
    }
    for (const dependency of Yarn.dependencies()) {
      if (dependency.ident.startsWith('@nx/')) {
        dependency.update(nx.range);
      }
    }
  },
};
