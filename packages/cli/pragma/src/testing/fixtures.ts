/**
 * Test fixtures for configuration parsing and package-manager detection.
 *
 * Groups sample config strings and mock binary paths used by
 * unit tests across the config and package-manager domains.
 */

/** Full config with both tier and channel set. */
const SAMPLE_CONFIG_FULL = `tier = "apps/lxd"
channel = "experimental"
`;

/** Config with only the tier field set. */
const SAMPLE_CONFIG_TIER_ONLY = `tier = "global"
`;

/** Empty config — no tier, no channel override. */
const SAMPLE_CONFIG_EMPTY = "";

/** Mock pragma binary paths keyed by package manager name. */
const MOCK_BIN_PATHS: Record<string, string> = {
  bun: "/home/user/.bun/install/global/node_modules/.bin/pragma",
  pnpm: "/home/user/.local/share/pnpm/global/5/node_modules/.bin/pragma",
  yarn: "/home/user/.yarn/bin/pragma",
  npm: "/home/user/.config/nvm/versions/node/v24/bin/pragma",
  local: "/project/node_modules/.bin/pragma",
};

export {
  MOCK_BIN_PATHS,
  SAMPLE_CONFIG_EMPTY,
  SAMPLE_CONFIG_FULL,
  SAMPLE_CONFIG_TIER_ONLY,
};
