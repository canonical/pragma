/**
 * Package-level constants — the distribution's identity, projected.
 *
 * The bin name, MCP server name, description and issues URL are NOT authored
 * here: they are read from the distribution config (`pragma.conf.ts`), so a fork
 * changes values, not code. The import is static because the surfaces that need
 * identity — `--help`, `__complete`, first-run onboarding, the MCP handshake —
 * all run before or without the config layer. That is safe precisely because
 * `pragma.conf.ts` is inert data: a plain object literal whose only import is a
 * type. It reaches no zod schema, no fs, no evaluator. `capabilities/lazy.test.ts`
 * pins that boundary, and `src/identity.test.ts` proves the projection.
 *
 * Also holds the stable cross-cutting enums (output formats, detail levels).
 */

import pkg from "../package.json" with { type: "json" };
import identity from "../pragma.conf.js";

/** CLI binary name — the distribution's `name`. */
const BIN_NAME = identity.name;

/**
 * MCP server identity — the same name as the CLI bin, so agents already pointed
 * at the server resolve it unchanged.
 */
const MCP_SERVER_NAME = identity.name;

/** One-line program description for help and server metadata. */
const PROGRAM_DESCRIPTION = identity.help;

/** Where the distribution asks users to file issues and feedback. */
const ISSUES_URL = identity.issuesUrl;

/** Semver version string read from package.json. */
const VERSION: string = pkg.version;

/**
 * Prefix for every `recovery.cli` hint: the distribution's name plus a space, so
 * recovery strings quote the command a user can actually run (D5). Recovery
 * hints are authored through `cliRecovery`, which enforces it.
 */
const RECOVERY_CLI_PREFIX = `${identity.name} `;

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
  ISSUES_URL,
  MCP_SERVER_NAME,
  OUTPUT_FORMATS,
  PROGRAM_DESCRIPTION,
  RECOVERY_CLI_PREFIX,
  VERSION,
};
