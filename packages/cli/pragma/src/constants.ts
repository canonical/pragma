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
 * Also holds the stable cross-cutting enums: output formats here, and the
 * detail levels re-exported from `kernel/config/types.ts`, where the config
 * validator closes the `detail` field over them.
 */

import pkg from "../package.json" with { type: "json" };
import identity from "../pragma.conf.js";
import type { RawConfig } from "./kernel/config/types.js";
import { DETAIL_LEVELS, type DetailLevel } from "./kernel/config/types.js";

/** CLI binary name — the distribution's `name`. */
const BIN_NAME = identity.name;

/**
 * MCP server identity — the same name as the CLI bin, so agents already pointed
 * at the server resolve it unchanged. Also the `serverInfo.name` the server
 * introduces itself with on the wire (paired with {@link VERSION} by
 * `buildServer`), so a peer reads the distribution's declared name, never a
 * hardcoded one.
 */
const MCP_SERVER_NAME = identity.name;

/** One-line program description for help and server metadata. */
const PROGRAM_DESCRIPTION = identity.help;

/** Where the distribution asks users to file issues and feedback. */
const ISSUES_URL = identity.issuesUrl;

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

/**
 * A selected output format. The set is CLOSED — no alias normalises into it,
 * so a `--format` value outside {@link OUTPUT_FORMATS} is rejected at the
 * entry point rather than quietly becoming `plain`.
 */
type OutputFormat = (typeof OUTPUT_FORMATS)[number];

/** Default detail level when neither flag, config, nor spec pins one. */
const DEFAULT_DETAIL_LEVEL: DetailLevel = "standard";

/**
 * The wordmark `--help` opens with, as raw ASCII-art lines.
 *
 * PROJECTED from the distribution config, exactly like {@link BIN_NAME} and
 * {@link PROGRAM_DESCRIPTION} — a wordmark spells a name, so it is identity, and
 * `kernel/copy.test.ts` forbids any kernel string from naming the distribution.
 * Authoring the art here would have branded a fork's front door with someone
 * else's logo; declaring it as data means a fork ships its own or none.
 *
 * Lines rather than one string because the art contains a backtick and
 * backslashes: a template literal would need every one of them escaped, which is
 * how a character gets lost the next time someone edits it.
 */
// Read through the DECLARED type, not the literal's inferred one. The
// distribution config is `satisfies RawConfig`, which narrows to exactly the
// keys that file writes — so `identity.logo` does not typecheck in a fork that
// omits the field, which is precisely the fork this feature promises a bare
// header. The assignment (not a cast) is what `satisfies` already guarantees,
// and it makes every OPTIONAL field readable here. The other constants keep
// reading `identity` directly, so their literal types are untouched.
const declared: RawConfig = identity;

const PROGRAM_LOGO: readonly string[] = declared.logo ?? [];

export type { DetailLevel, OutputFormat };
export {
  BIN_NAME,
  DEFAULT_DETAIL_LEVEL,
  DETAIL_LEVELS,
  ISSUES_URL,
  MCP_SERVER_NAME,
  OUTPUT_FORMATS,
  PROGRAM_DESCRIPTION,
  PROGRAM_LOGO,
  PROJECT_CONFIG_FILENAME,
  RECOVERY_CLI_PREFIX,
  VERSION,
};
