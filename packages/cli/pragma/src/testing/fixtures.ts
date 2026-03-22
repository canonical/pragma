const SAMPLE_CONFIG_FULL = `tier = "apps/lxd"
channel = "experimental"
`;

const SAMPLE_CONFIG_TIER_ONLY = `tier = "global"
`;

const SAMPLE_CONFIG_EMPTY = "";

const MOCK_BIN_PATHS: Record<string, string> = {
  bun: "/home/user/.bun/install/global/node_modules/.bin/pragma",
  pnpm: "/home/user/.local/share/pnpm/global/5/node_modules/.bin/pragma",
  yarn: "/home/user/.yarn/bin/pragma",
  npm: "/home/user/.config/nvm/versions/node/v24/bin/pragma",
  local: "/project/node_modules/.bin/pragma",
};

export {
  SAMPLE_CONFIG_FULL,
  SAMPLE_CONFIG_TIER_ONLY,
  SAMPLE_CONFIG_EMPTY,
  MOCK_BIN_PATHS,
};
