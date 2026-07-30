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
 * Terms must be PREFIXED NAMES, and {@link parseVocabulary} rejects anything
 * else by name. They are interpolated into SPARQL, where an absolute IRI
 * written bare is a parse error — and a parse error swallowed at the read site
 * is indistinguishable from an empty graph, which is how a malformed
 * declaration would otherwise surface as "this distribution has no prompts".
 * Failing at module load is correct for a compiled-in build defect: the
 * distribution config's own layer validation (`config/defaults.ts`) already
 * throws the same way.
 *
 * Standard vocabulary (`rdfs:label`, `rdfs:comment`) is deliberately absent —
 * it is the same in every graph, and the index already treats it as universal.
 */

import { vocabulary } from "../../pragma.conf.js";
import { BIN_NAME } from "../constants.js";
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

/** The distribution config file, quoted in the diagnostics. */
const CONF_FILE = `${BIN_NAME}.conf.ts`;

/**
 * Hold one declared term to the shape a generated query can read.
 *
 * @param field - The term's path in the declaration, for the message.
 * @param term - The declared value.
 * @param source - The file the declaration was read from.
 * @throws PragmaError CONFIG_ERROR when the term is not `prefix:local`.
 */
function assertPrefixedName(field: string, term: string, source: string): void {
  if (PREFIXED_NAME.test(term)) return;
  throw PragmaError.configError(
    `Invalid vocabulary in ${source}: \`${field}\` must be a prefixed name like \`ex:thing\`, not ${JSON.stringify(term)}.`,
    {
      recovery: {
        message: `In ${source}, bind the namespace under \`prefixes\` and write \`${field}\` as \`<prefix>:<local>\`. These terms are interpolated into queries, which cannot read an absolute IRI here.`,
      },
    },
  );
}

/**
 * Validate a declared vocabulary.
 *
 * @param raw - A distribution's `vocabulary` export.
 * @param source - The file it was declared in, quoted in errors.
 * @returns The same declaration, once every term is a prefixed name.
 * @throws PragmaError CONFIG_ERROR naming the offending field and its value.
 */
export function parseVocabulary(
  raw: DeclaredVocabulary,
  source: string,
): DeclaredVocabulary {
  assertPrefixedName("altName", raw.altName, source);
  for (const [term, value] of Object.entries(raw.prompt)) {
    assertPrefixedName(`prompt.${term}`, value, source);
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
export const VOCABULARY = parseVocabulary(vocabulary, CONF_FILE);
