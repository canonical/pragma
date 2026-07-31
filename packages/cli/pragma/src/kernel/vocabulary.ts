/**
 * The domain vocabulary this distribution declares, validated once at load.
 *
 * The kernel reads a graph whose vocabulary it must not name. Two of its reads
 * need domain terms: the pack index projects an alternative-name property into
 * `altNames` (what a family is addressed by, hence what completes and what a
 * lookup resolves), and the MCP prompt surface materializes prompt entities
 * with a generated SELECT. Both take their terms from here, and the bundled
 * capability packs that query the same terms read the same declaration — so
 * complete and resolve cannot drift apart.
 *
 * A DISTRIBUTION DECLARATION, not a config layer field, and deliberately so.
 * Both readers sit where the config layer is unreachable: the storeless
 * `__complete` fast path builds a completion ref at module load, and the index
 * is built inside the pack builder. Made layerable, a user setting it in their
 * project config would change nothing anywhere — silence, which is the exact
 * failure a dead config field is. A fork ships its own binary: it edits the
 * declaration and rebuilds.
 *
 * Terms must be PREFIXED NAMES whose prefix the distribution BINDS, and
 * {@link parseVocabulary} rejects anything else by name. They are interpolated
 * into SPARQL, where an absolute IRI written bare is a parse error and an
 * unbound prefix is either a parse error or a silently empty result — and a
 * failed read is indistinguishable from an empty graph, which is how a
 * malformed declaration would otherwise surface as "this distribution has no
 * prompts". Both halves matter: rejecting the shape alone still lets a
 * one-character typo (`ds:name` → `dss:name`) pass startup and then drop every
 * `altNames` from the index while reporting a built store as unbuilt. Failing
 * at module load is correct for a compiled-in build defect: the distribution
 * config's own layer validation (`config/defaults.ts`) already throws the same
 * way.
 *
 * Standard vocabulary (`rdfs:label`, `rdfs:comment`) is deliberately absent —
 * it is the same in every graph, and the index already treats it as universal.
 */

import conf, { vocabulary } from "../../pragma.conf.js";
import { PragmaError } from "./error/PragmaError.js";

/** The domain terms the kernel reads a distribution's graph with. */
export interface DeclaredVocabulary {
  /**
   * The property an entity family is addressed by, beside `rdfs:label` — the
   * tokens the index offers as candidates and a bespoke lookup matches on.
   */
  readonly altName: string;
  /** The prompt entity shape the MCP prompt surface reads. */
  readonly prompt: {
    /** The class every prompt entity carries. */
    readonly type: string;
    /** The template body, with `{{arg}}` placeholders. */
    readonly body: string;
    /** Links a prompt to one of its declared arguments. */
    readonly argument: string;
    /** An argument's name. */
    readonly argName: string;
    /** Whether an argument is required. */
    readonly argRequired: string;
  };
}

/** A prefixed name — `prefix:local`, the only form a generated query can read. */
const PREFIXED_NAME = /^[A-Za-z][A-Za-z0-9_-]*:[A-Za-z_][A-Za-z0-9_.-]*$/;

/**
 * The distribution config file, quoted in the diagnostics.
 *
 * The literal, not `${BIN_NAME}.conf.ts`: the import above names this file, and
 * so do four other modules, so a fork CANNOT rename it — deriving the name from
 * the fork's would send its maintainer to a path that is not on disk.
 * `config/defaults.ts` names the same file for the same reason.
 */
const CONF_FILE = "pragma.conf.ts";

/**
 * Hold one declared term to a form a generated query can actually read: the
 * `prefix:local` shape, AND a prefix the distribution binds.
 *
 * @param field - The term's path in the declaration, for the message.
 * @param term - The declared value.
 * @param prefixes - The distribution's declared namespace bindings.
 * @param source - The file the declaration was read from.
 * @throws PragmaError CONFIG_ERROR when the term is not `prefix:local`, or
 *   names a prefix `prefixes` does not bind.
 */
function assertReadableTerm(
  field: string,
  term: string,
  prefixes: Readonly<Record<string, string>>,
  source: string,
): void {
  const reject = (problem: string, fix: string): never => {
    throw PragmaError.configError(
      `Invalid vocabulary in ${source}: \`${field}\` ${problem}, not ${JSON.stringify(term)}.`,
      { recovery: { message: `In ${source}, ${fix}` } },
    );
  };
  if (!PREFIXED_NAME.test(term)) {
    reject(
      "must be a prefixed name like `ex:thing`",
      `write \`${field}\` as \`<prefix>:<local>\`. These terms are interpolated into queries, which cannot read an absolute IRI here.`,
    );
  }
  const prefix = term.slice(0, term.indexOf(":"));
  if (!Object.hasOwn(prefixes, prefix)) {
    reject(
      `must use a prefix \`prefixes\` binds, and nothing binds \`${prefix}:\``,
      `either bind \`${prefix}\` under \`prefixes\` or write \`${field}\` with a prefix that is bound. An unbound prefix makes the generated query fail, which a read cannot tell apart from an empty graph.`,
    );
  }
}

/**
 * Validate a declared vocabulary.
 *
 * @param raw - A distribution's `vocabulary` export.
 * @param prefixes - That distribution's `prefixes`, which must bind every
 *   prefix the terms use.
 * @param source - The file it was declared in, quoted in errors.
 * @returns The same declaration, once every term is readable.
 * @throws PragmaError CONFIG_ERROR naming the offending field and its value.
 */
export function parseVocabulary(
  raw: DeclaredVocabulary,
  prefixes: Readonly<Record<string, string>>,
  source: string,
): DeclaredVocabulary {
  assertReadableTerm("altName", raw.altName, prefixes, source);
  for (const [term, value] of Object.entries(raw.prompt)) {
    assertReadableTerm(`prompt.${term}`, value, prefixes, source);
  }
  return raw;
}

/**
 * This distribution's validated vocabulary.
 *
 * The declaration is type-checked at this call — a fork that drops or mistypes
 * a term fails `tsc`, and one that writes an unreadable term fails here at
 * startup rather than at the read that would have swallowed it.
 */
export const VOCABULARY = parseVocabulary(
  vocabulary,
  conf.prefixes ?? {},
  CONF_FILE,
);
