/**
 * Package-level constants for the pragma v2 kernel.
 *
 * Program metadata (bin name, MCP server name, description, version) plus the
 * stable cross-cutting enums (output formats, detail levels). The CLI binary
 * and the MCP server share the single `pragma` identity, so existing agent
 * wiring keeps resolving the server unchanged.
 */

import pkg from "../package.json" with { type: "json" };

/** CLI binary name for the v2 kernel (installed as `pragma`). */
const BIN_NAME = "pragma";

/**
 * MCP server identity — `pragma`, matching the CLI bin, so agents already
 * pointed at the pragma server resolve it unchanged.
 */
const MCP_SERVER_NAME = "pragma";

/** One-line program description for help and server metadata. */
const PROGRAM_DESCRIPTION = "CLI and MCP server for Canonical's design system.";

/** Semver version string read from package.json. */
const VERSION: string = pkg.version;

/**
 * Literal prefix for every `recovery.cli` hint (`pragma `): recovery strings
 * quote the stable, documented command name — matching the bin (D5). The
 * recovery invariant test enforces this.
 */
const RECOVERY_CLI_PREFIX = "pragma ";

/** The output formats the renderer selects between (`llm` = condensed Markdown). */
const OUTPUT_FORMATS = ["plain", "llm", "json"] as const;

/** A selected output format. `--format text` is normalised to `plain`. */
type OutputFormat = (typeof OUTPUT_FORMATS)[number];

/** Progressive-disclosure levels, least to most detail. */
const DETAIL_LEVELS = ["summary", "standard", "detailed"] as const;

/** A progressive-disclosure level. */
type DetailLevel = (typeof DETAIL_LEVELS)[number];

/** Default detail level when neither flag, config, nor spec pins one. */
const DEFAULT_DETAIL_LEVEL: DetailLevel = "standard";

export type { DetailLevel, OutputFormat };
export {
  BIN_NAME,
  DEFAULT_DETAIL_LEVEL,
  DETAIL_LEVELS,
  MCP_SERVER_NAME,
  OUTPUT_FORMATS,
  PROGRAM_DESCRIPTION,
  RECOVERY_CLI_PREFIX,
  VERSION,
};
