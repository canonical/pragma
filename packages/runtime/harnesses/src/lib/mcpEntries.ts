/**
 * Per-harness MCP entry SHAPES — the registry column that turns "what does a
 * pragma server entry look like in THIS harness's config file" into data.
 *
 * One hardcoded `{command, args, cwd}` shape used to be written for every
 * harness, which was wrong wherever a harness's own schema demands a different
 * shape: OpenCode's `McpLocalConfig` requires `type: "local"`, takes `command`
 * as a STRING ARRAY (command + args combined), spells its env map
 * `environment`, and declares `additionalProperties: false` — so the shared
 * shape was rejected three ways over (S1-3). A serializer per harness fixes
 * the CLASS of bug, not the one symptom: both the writer and the read-back
 * classifier consume the same serialized shape, so "already configured" stays
 * byte-for-byte what a write would emit and idempotence holds per harness.
 *
 * Shapes verified against each tool's own documentation (fetched 2026-08-27):
 * - OpenCode: https://opencode.ai/config.json (`$defs.McpLocalConfig` —
 *   required `["type","command"]`, `command: string[]`, optional `cwd`,
 *   `environment`, `enabled`; `additionalProperties: false`).
 * - Cursor: https://cursor.com/docs/context/mcp (stdio entries carry
 *   `type: "stdio"` + `command` + optional `args`/`env`).
 * - Copilot CLI: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers
 *   (local entries: `type: "local"`, `command`, `args`, `env`, `tools`).
 */

import type { McpServerConfig } from "./types.js";

/**
 * Serialize the canonical pragma {@link McpServerConfig} into the JSON/TOML
 * entry a specific harness's config schema requires. The registry's
 * `mcpEntry` column; resolved onto every {@link ConfigTarget} so writer and
 * classifier can never disagree about a harness's shape.
 */
export type McpEntrySerializer = (
  config: McpServerConfig,
) => Record<string, unknown>;

/**
 * The canonical `{command, args?, cwd?, env?}` shape most harnesses accept
 * (Claude Code `.mcp.json`, Gemini CLI, Codex TOML, VS Code `servers`,
 * Windsurf/Antigravity `mcp_config.json`). Optional fields are omitted, not
 * written as `undefined`/empty, so a minimal entry stays minimal.
 */
export const defaultMcpEntry: McpEntrySerializer = (config) => {
  const entry: Record<string, unknown> = { command: config.command };
  if (config.args !== undefined) entry.args = [...config.args];
  if (config.cwd !== undefined) entry.cwd = config.cwd;
  if (config.env !== undefined) entry.env = { ...config.env };
  return entry;
};

/**
 * OpenCode's `McpLocalConfig`: `type: "local"` (required), `command` as ONE
 * string array (command + args combined), env under `environment` (not
 * `env`), optional `cwd`. `additionalProperties: false` in the live schema —
 * an `args` or `env` key fails validation, which is exactly what the shared
 * default shape used to write (S1-3).
 */
export const opencodeMcpEntry: McpEntrySerializer = (config) => {
  const entry: Record<string, unknown> = {
    type: "local",
    command: [config.command, ...(config.args ?? [])],
  };
  if (config.cwd !== undefined) entry.cwd = config.cwd;
  if (config.env !== undefined) entry.environment = { ...config.env };
  return entry;
};

/**
 * Cursor's stdio entry: the default shape plus the documented `type: "stdio"`
 * discriminator. `cwd` is NOT in Cursor's documented field set but is kept:
 * Cursor has no strict (additionalProperties-style) validation on `mcp.json`,
 * and dropping it would silently change where the pragma server resolves the
 * project — the machine-band `cwd` question is S3-11's product call, not this
 * column's.
 */
export const cursorMcpEntry: McpEntrySerializer = (config) => ({
  type: "stdio",
  ...defaultMcpEntry(config),
});

/**
 * Copilot CLI's `~/.copilot/mcp-config.json` local entry: `type: "local"`
 * plus the default fields, and `tools: ["*"]` (the documented example grants
 * the server's full tool surface; without the key the docs do not define
 * which tools are enabled).
 */
export const copilotMcpEntry: McpEntrySerializer = (config) => ({
  type: "local",
  ...defaultMcpEntry(config),
  tools: ["*"],
});

/**
 * OpenDesign requires the entry's `env` to be present as a JSON object/map —
 * VERIFY(7g): internal tool, contract unconfirmed against public docs. The
 * previous `normalizeEnv` boolean column expressed exactly this one tweak;
 * it is now just another entry shape.
 */
export const opendesignMcpEntry: McpEntrySerializer = (config) => ({
  ...defaultMcpEntry(config),
  env: { ...(config.env ?? {}) },
});

/** Deep structural equality over JSON-shaped values (the matcher's helper). */
const deepEquals = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return (
      a.length === b.length && a.every((item, i) => deepEquals(item, b[i]))
    );
  }
  if (
    typeof a === "object" &&
    a !== null &&
    !Array.isArray(a) &&
    typeof b === "object" &&
    b !== null &&
    !Array.isArray(b)
  ) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return (
      aKeys.length === bKeys.length &&
      aKeys.every((key) =>
        deepEquals(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
      )
    );
  }
  return false;
};

/**
 * Whether an existing on-disk entry already matches what a serializer would
 * write: every serialized field must be present and deep-equal, while EXTRA
 * keys on the existing entry are ignored — a harness (or user) that decorates
 * the entry (e.g. `timeout`, `enabled`) still reads as `configured`, so a
 * re-run never churns a file it did not author.
 *
 * @param existing - The raw entry read back from a harness config.
 * @param want - The serialized entry a write would emit.
 * @returns Whether the existing entry matches over the serialized fields.
 */
export const mcpEntryMatches = (
  existing: unknown,
  want: Record<string, unknown>,
): boolean => {
  if (typeof existing !== "object" || existing === null) return false;
  const record = existing as Record<string, unknown>;
  return Object.entries(want).every(([key, value]) =>
    deepEquals(record[key], value),
  );
};
