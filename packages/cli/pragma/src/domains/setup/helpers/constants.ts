/**
 * Constants for setup commands.
 */

/** VS Code settings keys for the Terrazzo LSP extension. */
export const LSP_SETTINGS: Record<string, unknown> = {
  "terrazzo-lsp.configPath": "./tokens.config.mjs",
  "terrazzo-lsp.tokenSources": [
    "./node_modules/@canonical/ds-global/tokens/**/*.json",
  ],
};

/** MCP server name written into harness configs. */
export const MCP_SERVER_NAME = "pragma";
