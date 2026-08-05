/**
 * Package-level constants — the distribution's identity, projected.
 *
 * The bin name, MCP server name, description, issues URL and the distribution's
 * own colophon are NOT authored here: they are read from the distribution
 * config (`pragma.conf.ts`), so a fork changes values, not code. The import is
 * static because the surfaces that need identity — `--help`, `__complete`,
 * first-run onboarding, the MCP handshake — all run before or without the
 * config layer. That is safe precisely because `pragma.conf.ts` is inert data:
 * a plain object literal whose only import is a type. It reaches no zod schema,
 * no fs, no evaluator. `capabilities/lazy.test.ts` pins that boundary, and
 * `src/identity.test.ts` proves the projection.
 *
 * Also holds the stable cross-cutting enums (output formats, detail levels).
 */

import pkg from "../package.json" with { type: "json" };
import identity from "../pragma.conf.js";
import type { RawConfig } from "./kernel/config/types.js";

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

/**
 * The distribution's own colophon section, or `undefined` when it declares none.
 *
 * The same projection seam as {@link PROGRAM_DESCRIPTION}: `colophon` used to be
 * a narrative hardcoded under `src/capabilities/colophon/`, which a fork
 * inherited whole. `collectColophon` reads it from here, so `src/identity.test.ts`
 * proves a fork's colophon is its own the same way it proves the front door is.
 * Adds no string literal, so the kernel copy guard is unaffected.
 *
 * Read through the DECLARED contract, not off the literal. `pragma.conf.ts` ends
 * in `satisfies RawConfig`, which yields the literal's own type — so a property
 * this distribution happens to declare is compile-REQUIRED of every fork, and a
 * fork omitting `colophon` would fail `tsc` here (TS2339, measured), inside a
 * kernel file it is not supposed to edit. The field is optional, the reference
 * page says so, and `collectColophon` has an omit-the-section branch that no
 * type-checking distribution could otherwise reach. The cast is type-only and
 * erased, so the fast-path module graph is unchanged (`kernel/config/types.ts`
 * is already on it, positive-listed by `completion/safety.test.ts`) — and that
 * erasure is CHECKED, not merely asserted: the graph probes read `from "…"`
 * textually and cannot tell a type import from a value one, so
 * `capabilities/lazy.test.ts` reads this file's import statements directly and
 * fails if the edge into `kernel/config/**` stops being written `import type`.
 */
const DISTRIBUTION_COLOPHON = (identity as RawConfig).colophon;

/** Semver version string read from package.json. */
const VERSION: string = pkg.version;

/**
 * The project config filename the walker looks for and every surface that
 * quotes it — diagnostics, the onboarding note, the generated reference, the
 * surface covenant — names. It lives HERE rather than beside the walker so the
 * quoting surfaces do not have to import `kernel/config/**`: the storeless
 * `--help`/`__complete` graph is asserted to reach no config module, and
 * `completion/safety.test.ts` fails the moment one arrives.
 */
const PROJECT_CONFIG_FILENAME = `${identity.name}.config.ts`;

/**
 * The distribution's name plus a space: the prefix a `recovery.cli` hint carries
 * so it quotes a command the installed binary answers to (D5). Kernel hints are
 * authored through `cliRecovery`, which prepends it; `packs/schema.ts` REJECTS
 * it in a user-authored pack's `emptyRecovery.cli`, because the CONSUMING
 * distribution's renderer supplies its own. Use {@link BIN_NAME} for prose —
 * this constant's trailing space belongs to the recovery invariant, not to
 * sentences.
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

/**
 * The tokens `bin.ts` answers at `argv[0]` BEFORE the command tree is built.
 *
 * Declared here rather than as literals in `bin.ts` because three places must
 * agree and one of them cannot see the other two: the bin dispatches these,
 * and `kernel/packs/collect.ts` must REFUSE to let a story claim one as its
 * noun — on BOTH tiers, `validateStories` for the package tier and
 * `assembleEffectiveModules` for the config tiers, which do not share a code
 * path. A story claiming `mcp` used to compile, register and then be
 * permanently unreachable, because the bin answers `mcp` and returns before
 * `buildProgram` runs — a noun that exists in the model, appears nowhere, and
 * dispatches never.
 *
 * Reservation was keyed on capability MODULE NAME, which meant the phantom
 * module `meta` was reserved (it owned `hidden` specs for two of these) while
 * the three tokens that actually short-circuit dispatch were not. Deleting
 * `meta` removed even that accidental cover, so the real tokens are named.
 *
 * `__store-probe` is included though no pack would plausibly claim it: the
 * property is "the bin answered it first", and that is true of all three.
 *
 * MEASURED: only `mcp` was ever CLAIMABLE. A story noun must be kebab-case, so
 * `parsePackDefinition` refuses the two underscore tokens one layer earlier,
 * on both tiers. All three are reserved anyway, because the kebab rule and the
 * reservation are independent and either can be relaxed alone.
 */
const BIN_FAST_PATH_TOKENS = ["mcp", "__complete", "__store-probe"] as const;

export type { DetailLevel, OutputFormat };
export {
  BIN_FAST_PATH_TOKENS,
  BIN_NAME,
  DEFAULT_DETAIL_LEVEL,
  DETAIL_LEVELS,
  DISTRIBUTION_COLOPHON,
  ISSUES_URL,
  MCP_SERVER_NAME,
  OUTPUT_FORMATS,
  PROGRAM_DESCRIPTION,
  PROJECT_CONFIG_FILENAME,
  RECOVERY_CLI_PREFIX,
  VERSION,
};
