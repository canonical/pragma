/**
 * Package-level constants for the pragma v2 kernel.
 *
 * Program metadata (bin name, MCP server name, description, version) plus the
 * stable cross-cutting enums (output formats, detail levels). The CLI binary
 * is `pragma2` during the v2 rebuild window; the MCP server keeps the stable
 * `pragma` identity so existing agent wiring keeps resolving it.
 */

import pkg from "../package.json" with { type: "json" };

/** CLI binary name for the v2 kernel (installed as `pragma2`). */
const BIN_NAME = "pragma2";

/**
 * MCP server identity. Kept as `pragma` (not `pragma2`) so agents already
 * pointed at the pragma server resolve it unchanged across the rebuild.
 */
const MCP_SERVER_NAME = "pragma";

/** One-line program description for help and server metadata. */
const PROGRAM_DESCRIPTION = "CLI and MCP server for Canonical's design system.";

/** Semver version string read from package.json. */
const VERSION: string = pkg.version;

/**
 * Literal prefix for every `recovery.cli` hint. Held at `pragma ` (not
 * `pragma2 `) during the v2 window: recovery strings quote the stable,
 * documented command name, and the cosmetic mismatch with the `pragma2`
 * bin is accepted (D5). The recovery invariant test enforces this.
 */
const RECOVERY_CLI_PREFIX = "pragma ";

/** The two machine/human output formats the renderer selects between. */
const OUTPUT_FORMATS = ["plain", "json"] as const;

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
