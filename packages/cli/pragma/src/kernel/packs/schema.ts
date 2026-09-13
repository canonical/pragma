/**
 * The zod pack-definition validator — the single gate for DYNAMIC (config- and
 * package-declared) packs and the parity round-trip tests. It replaces the old
 * ~1,000-line hand validator with a schema plus a handful of cross-field
 * refinements that encode the source rule (§3): `type` XOR `types`, a
 * graphql-sourced lookup names its fragment target, SPARQL expands stay
 * single-hop, GraphQL fields reject property paths, and every disclosure `level`
 * names a declared canonical level. Two more refinements make the definition
 * COMPILABLE, not merely well-shaped: distinct compiled verb names and distinct
 * filter params (see {@link refineVerbNames} / {@link refineFilterParams}).
 *
 * zod lives here and ONLY here in the pack layer, imported lazily (never on the
 * `--help`/`__complete` fast path). The distribution's own stories are compiled
 * statically by `capabilities/distribution.ts` and never revalidated at dispatch
 * (`collect.projectStoryTiers`'s default-origin carve-out); this runs for config-
 * and package-declared stories, and in `distribution.test.ts`'s round-trip.
 *
 * That carve-out is exactly why the rest of the compilability rules are NOT
 * here. A rule stated only in this file reaches a third-party author at
 * declaration and the distribution's own stories not at all — they meet it as a
 * first-call CONFIG_ERROR. Those rules live in {@link ./storyRules}, which
 * `compileStoryModule` runs for every tier, and {@link refineListShape} reports
 * them as zod issues so a config author still reads them here, in the same
 * words and at the same paths.
 */

import { z } from "zod";
import { DETAIL_LEVELS, RECOVERY_CLI_PREFIX } from "../../constants.js";
import { PragmaError } from "../error/index.js";
import { listShapeIssues } from "./storyRules.js";
import {
  type PackDefinition,
  type PackList,
  RESERVED_STORY_PARAMS,
} from "./types.js";

const NOUN_PATTERN = /^[a-z][a-z0-9-]*$/;
/** Message for {@link NOUN_PATTERN} — third-party authors never see the regex. */
const NOUN_MESSAGE = 'must be lowercase kebab-case, e.g. "design-token"';
/**
 * A filter's parameter name: lowercase-initial, then letters and digits.
 *
 * camelCase is admitted because the PROJECTOR already relies on it —
 * `emitSurface`'s `emitVerb` writes a flag as `--${kebabCase(param)}`, so a
 * param named `channelOf` was always going to become `--channel-of`, and only
 * this gate refused to let anyone declare it. A story wanting a two-word
 * dimension had no spelling at all: `channel-of` fails the pattern too, and
 * `channelof` projects to the unreadable `--channelof`.
 *
 * This is a WIDENING of what an author may declare, matched to what the
 * projector already emits, and it closes a tier split rather than opening one:
 * the distribution's own stories are compiled statically and never revalidated
 * (see `storyRules.ts`), so `pragma.conf.ts` could already declare a param this
 * schema would have refused from a package. The same rule now reaches both.
 *
 * Still lowercase-INITIAL: a leading capital would kebab to a leading dash and
 * Commander would read the flag as empty.
 */
const FILTER_PARAM_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
const FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const GRAPHQL_NAME_PATTERN = /^[_A-Za-z][_0-9A-Za-z]*$/;
/**
 * A prefixed name (`ds:Thing`), a property path of them, or an absolute IRI.
 * Each path segment may carry the SPARQL inverse marker (`^ds:tier`) — the
 * contract (`types.ts`) admits "prefixed name, IRI, or path", and an inverse
 * step IS a property path, so rejecting it here was a schema bug, not a
 * grammar decision (L-OPEN-9: the tier story's `blocks` expand reads
 * `^ds:tier`).
 */
const TERM_PATTERN =
  /^(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/[^<>"\s]+|\^?[A-Za-z][\w-]*:[^/<>"\s]+(?:\/\^?[A-Za-z][\w-]*:[^/<>"\s]+)*)$/;

/** Params a filter/verb may not claim — the kernel's own, from the grammar. */
const RESERVED_PARAMS = new Set(RESERVED_STORY_PARAMS);

/**
 * Whether an author-supplied query is a SELECT (optionally preceded by its own
 * PREFIX lines). Every author query a story declares runs through `runSelect`,
 * which reads `result.bindings` — so a non-SELECT is a shape mismatch caught
 * here rather than downstream.
 *
 * Used for a `vocabulary.query` only, which is run exactly as the author wrote
 * it. A `list.query` gets the real reader instead ({@link ./storyRules}, via
 * `sparql/authorQuery.ts`), because this pattern is NARROWER than what a page
 * can now serve: it admits `PREFIX` lines but not a leading comment, not
 * `BASE`, and not a lower-case `prefix` — all of which the lift handles. A
 * grammar that refuses the shape the kernel supports is the same defect as one
 * that admits the shape it cannot, read from the other side.
 */
function isSelectQuery(query: string): boolean {
  return /^\s*(?:PREFIX\s+[^\n]*\n\s*)*SELECT\s/i.test(query);
}

const term = z.string().regex(TERM_PATTERN, "must be a prefixed name or IRI");
const graphqlName = z.string().regex(GRAPHQL_NAME_PATTERN);
const fieldName = z.string().regex(FIELD_PATTERN);

const columnSchema = z
  .object({ field: fieldName, label: z.string().optional() })
  .strict();

const vocabularySchema = z
  .object({
    query: z.string().min(1),
    variable: fieldName.optional(),
  })
  .strict();

const filterSchema = z
  .object({
    param: z.string().regex(FILTER_PARAM_PATTERN),
    variable: fieldName,
    values: z.array(z.string()).min(1).optional(),
    match: z.enum(["exact", "set"]).optional(),
    vocabulary: vocabularySchema.optional(),
    description: z.string().optional(),
  })
  .strict()
  .refine((f) => !RESERVED_PARAMS.has(f.param), {
    message: "filter param is a reserved name",
  })
  // A declared `values` set IS the vocabulary — the filter projects it as an
  // enum and canonicalizes against it. A second, graph-read one alongside would
  // be a silent no-op at best and a disagreement at worst.
  .refine((f) => !(f.values && f.vocabulary), {
    message:
      '"values" and "vocabulary" are mutually exclusive — a declared value set is already the vocabulary',
  })
  .refine((f) => !f.vocabulary || isSelectQuery(f.vocabulary.query), {
    message: '"vocabulary.query" must be a SPARQL SELECT query',
  });
// A filter must also say WHAT it admits, one way or the other — it used to be
// able to say neither and fall back to the values the returned ROWS carried,
// which a page makes actively wrong. That rule is a compilability rule rather
// than a shape rule, so it is checked in `storyRules.ts` (which the
// distribution's own stories reach too) and reported from `refineListShape`
// below at the same `…filters.N` path it always used.

const searchSchema = z
  .object({
    variables: z.array(fieldName).min(1),
    description: z.string().optional(),
  })
  .strict();

const emptyRecoverySchema = z
  .object({
    message: z.string().min(1),
    // The command WITHOUT a binary name — the renderer prepends the CONSUMING
    // distribution's. A story is portable only if it does not name a binary, so
    // the old prefixed form is rejected rather than accepted and doubled. Named
    // loudly, in the `packages` → `packs` tradition, because a third-party pack
    // written against the old grammar is data, not a typo.
    cli: z
      .string()
      .min(1)
      .refine(
        (value) => !value.startsWith(RECOVERY_CLI_PREFIX),
        `emptyRecovery.cli is now the command WITHOUT the binary name — write "sources update", not "${RECOVERY_CLI_PREFIX}sources update"`,
      )
      .optional(),
  })
  .strict();

const listShape = {
  query: z.string().min(1),
  columns: z.array(columnSchema).min(1),
  filters: z.array(filterSchema).min(1).optional(),
  search: searchSchema.optional(),
  emptyRecovery: emptyRecoverySchema.optional(),
};

const listSchema = z.object(listShape).strict();
const verbSchema = z
  .object({
    ...listShape,
    verb: z.string().regex(NOUN_PATTERN, NOUN_MESSAGE),
    description: z.string().optional(),
    toolDescription: z.string().optional(),
  })
  .strict();

const fieldSchema = z
  .object({
    name: fieldName,
    property: term,
    label: z.string().optional(),
    graphqlField: graphqlName.optional(),
    level: z.string().optional(),
  })
  .strict();

const sectionSchema = fieldSchema.extend({
  kind: z.enum(["field", "code"]).optional(),
});

const nestedExpandSchema = z
  .object({
    name: fieldName,
    relation: term,
    graphqlField: graphqlName.optional(),
    select: z
      .array(
        z
          .object({
            name: fieldName,
            property: term,
            label: z.string().optional(),
            graphqlField: graphqlName.optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const expandFieldSchema = z
  .object({
    name: fieldName,
    property: term,
    label: z.string().optional(),
    graphqlField: graphqlName.optional(),
  })
  .strict();

const expandSchema = z
  .object({
    name: fieldName,
    heading: z.string().optional(),
    kind: z.enum(["list", "table"]).optional(),
    relation: term,
    graphqlField: graphqlName.optional(),
    select: z.array(z.union([nestedExpandSchema, expandFieldSchema])).min(1),
    showWhenEmpty: z.boolean().optional(),
    level: z.string().optional(),
  })
  .strict();

const disclosureSchema = z
  .object({
    levels: z.array(z.enum(DETAIL_LEVELS)).min(1),
    default: z.enum(DETAIL_LEVELS).optional(),
  })
  .strict()
  .superRefine((disclosure, ctx) => {
    // `default` must name a DECLARED level, not merely a canonical one — else the
    // injected MCP `detail` enum offers only the declared levels while the
    // advertised/resolved default is unselectable (compounds the divergence
    // resolvePackDetail guards at runtime).
    if (
      disclosure.default !== undefined &&
      !disclosure.levels.includes(disclosure.default)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `disclosure default "${disclosure.default}" is not one of the declared levels [${disclosure.levels.join(", ")}].`,
        path: ["default"],
      });
    }
  });

const sampleSchema = z.union([
  z.literal(true),
  z
    .object({
      count: z.number().int().min(1).max(5).optional(),
      fixedCount: z.boolean().optional(),
      description: z.string().optional(),
      toolDescription: z.string().optional(),
    })
    .strict(),
]);

const completionSchema = z
  .object({
    enabled: z.boolean().optional(),
    match: z.enum(["prefix", "substring", "fuzzy"]).optional(),
    minChars: z.number().int().min(0).optional(),
  })
  .strict();

/**
 * The declared scope-ranking factor (`PackScopeWeight`). `falloff` is bounded
 * the same way `weights` is — a factor outside 0–1 is a promotion, and this
 * declaration only ever DEMOTES a deeper scope below a shallower one.
 */
const scopeWeightSchema = z
  .object({
    via: term,
    by: term,
    falloff: z.number().min(0).max(1),
    asserted: term.optional(),
  })
  .strict();

const lookupSchema = z
  .object({
    source: z.enum(["sparql", "graphql"]).optional(),
    by: term,
    nameFallback: z.enum(["iri"]).optional(),
    type: term.optional(),
    description: z.string().optional(),
    toolDescription: z.string().optional(),
    types: z.array(term).min(1).optional(),
    weights: z.record(term, z.number().min(0).max(1)).optional(),
    scopeWeight: scopeWeightSchema.optional(),
    graphqlType: graphqlName.optional(),
    fields: z.array(fieldSchema).min(1).optional(),
    sections: z.array(sectionSchema).min(1).optional(),
    expand: z.array(expandSchema).min(1).optional(),
    disclosure: disclosureSchema.optional(),
    sample: sampleSchema.optional(),
    completion: completionSchema.optional(),
  })
  .strict();

const definitionSchema = z
  .object({
    noun: z.string().regex(NOUN_PATTERN, NOUN_MESSAGE),
    description: z.string().optional(),
    toolDescription: z.string().optional(),
    list: listSchema.optional(),
    verbs: z.array(verbSchema).min(1).optional(),
    lookup: lookupSchema.optional(),
    colophon: z.string().optional(),
  })
  .strict()
  .superRefine((def, ctx) => {
    if (!def.list && !def.lookup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'a pack must declare at least one of "list" or "lookup".',
      });
    }
    // "must be a SELECT" for a `list.query` is `refineListShape`'s to say, and
    // it says it from the reader that actually splits the query — which admits
    // the prologue shapes this file's own pattern does not.
    refineVerbNames(def, ctx);
    if (def.list) {
      refineFilterParams(def.list.filters, ["list"], ctx);
      refineListShape(def.list, ["list"], ctx);
    }
    for (const [index, verb] of (def.verbs ?? []).entries()) {
      refineFilterParams(verb.filters, ["verbs", index], ctx);
      refineListShape(verb, ["verbs", index], ctx);
    }
    if (def.lookup) refineLookup(def.lookup, ctx);
  });

/**
 * The compiled `(noun, verb)` keys must be distinct.
 *
 * `compilePack` emits `list`, then each `verbs[].verb`, then `lookup` and
 * `sample`. A repeat there survives the grammar into `assembleEffectiveModules`,
 * where `assertUniqueVerbs` throws — and package stories reach dispatch before
 * the command tree exists, so that throw would fail EVERY command, `doctor` and
 * `sources update` included. The collision is a property of the definition, so
 * the grammar is where it is caught.
 */
function refineVerbNames(
  def: {
    list?: unknown;
    verbs?: readonly { verb: string }[];
    lookup?: unknown;
  },
  ctx: z.RefinementCtx,
): void {
  const emitted = new Set<string>(def.list ? ["list"] : []);
  if (def.lookup) {
    emitted.add("lookup");
    if ((def.lookup as { sample?: unknown }).sample) emitted.add("sample");
  }
  const seen = new Set<string>();
  for (const [index, verb] of (def.verbs ?? []).entries()) {
    if (emitted.has(verb.verb) || seen.has(verb.verb)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `verb "${verb.verb}" is already compiled by this pack — every verb must be distinct.`,
        path: ["verbs", index, "verb"],
      });
    }
    seen.add(verb.verb);
  }
}

/**
 * Filter params project to CLI options, so a repeat inside one list shape makes
 * Commander refuse to register the second `--<param>` — outside every error
 * envelope the CLI owns.
 */
function refineFilterParams(
  filters: readonly { param: string }[] | undefined,
  path: readonly (string | number)[],
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  for (const [index, filter] of (filters ?? []).entries()) {
    if (seen.has(filter.param)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `filter param "${filter.param}" is declared twice.`,
        path: [...path, "filters", index, "param"],
      });
    }
    seen.add(filter.param);
  }
}

/**
 * The COMPILABILITY rules for one list-shaped body, reported as zod issues.
 *
 * The rules themselves live in {@link ./storyRules}, deliberately outside this
 * module: zod runs only for config- and package-declared stories, and a rule
 * whose violation is a CONFIG_ERROR has to reach the distribution's own stories
 * too — which it does by being checked in `compileStoryModule`, the door every
 * tier comes through. Stated in two places it would be two rules; delegated, a
 * third-party author and the distribution read the same sentence.
 *
 * What they cover: a query a page cannot wrap (its own prologue is lifted, but
 * a `FROM` clause and an unreadable projection cannot be), a filter or search
 * over a variable the query does not project, a filtered query shadowing the
 * generated variable prefix, and a filter that declares neither `values` nor a
 * `vocabulary`. None of them could be checked while filters were predicates
 * over returned rows: a variable that was not there simply matched nothing,
 * silently, with exit 0.
 */
function refineListShape(
  shape: PackList,
  path: readonly (string | number)[],
  ctx: z.RefinementCtx,
): void {
  for (const issue of listShapeIssues(shape, path)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: issue.message,
      path: [...issue.path],
    });
  }
}

/** Cross-field lookup rules — the source rule (§3, F8). */
function refineLookup(
  lookup: z.infer<typeof lookupSchema>,
  ctx: z.RefinementCtx,
): void {
  const source = lookup.source ?? "sparql";

  if (lookup.type !== undefined && lookup.types !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '"lookup.type" and "lookup.types" are mutually exclusive.',
      path: ["lookup"],
    });
  }

  // An IRI-derived name is only as trustworthy as the class vouching for the
  // entity it came from, and without a class constraint nothing bounds the scan
  // the derived-name population would run. Rejected rather than ignored, for the
  // same reason a stale weight is: a silent no-op is how a declaration that
  // never applied survives review.
  if (lookup.nameFallback !== undefined && !lookup.type && !lookup.types) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        '"lookup.nameFallback" requires a class constraint ("lookup.type" or "lookup.types") to vouch for the entities it names.',
      path: ["lookup", "nameFallback"],
    });
  }

  // A weight naming a type the lookup does not address can never apply. Reject
  // it rather than ignore it — a silent no-op is how a stale weight survives a
  // rename (the type moves, the weight stays, and nothing says so).
  const addressed = new Set<string>(
    lookup.types ?? (lookup.type ? [lookup.type] : []),
  );
  for (const named of Object.keys(lookup.weights ?? {})) {
    if (!addressed.has(named)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `"lookup.weights" names "${named}", which is not in "lookup.type"/"lookup.types".`,
        path: ["lookup", "weights"],
      });
    }
  }

  if (source === "graphql" && !lookup.graphqlType && !lookup.type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        '"lookup.source" "graphql" requires "lookup.graphqlType" (or a single "lookup.type" to derive it).',
      path: ["lookup"],
    });
  }

  const allValues = [...(lookup.fields ?? []), ...(lookup.sections ?? [])];
  const declared = new Set<string>(lookup.disclosure?.levels ?? []);

  for (const value of allValues) {
    if (value.level !== undefined && !declared.has(value.level)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `field "${value.name}" level "${value.level}" is not a declared disclosure level.`,
        path: ["lookup"],
      });
    }
    if (
      source === "graphql" &&
      isPropertyPath(value.property) &&
      !value.graphqlField
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `field "${value.name}" uses a property path, which the GraphQL source cannot express — set "graphqlField" or use source "sparql".`,
        path: ["lookup"],
      });
    }
  }

  for (const expand of lookup.expand ?? []) {
    if (expand.level !== undefined && !declared.has(expand.level)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `expand "${expand.name}" level "${expand.level}" is not a declared disclosure level.`,
        path: ["lookup"],
      });
    }
    for (const entry of expand.select) {
      if ("relation" in entry && source !== "graphql") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `expand "${expand.name}" nests a relation, which requires lookup.source "graphql" (the SPARQL expand sub-SELECT is single-hop).`,
          path: ["lookup"],
        });
      }
    }
  }
}

/** A term with a `/` join of prefixed names (never an absolute IRI). */
function isPropertyPath(term: string): boolean {
  return term.includes("/") && !term.includes("://");
}

/**
 * Validate a raw pack definition, throwing a config error on the first issue.
 *
 * @param raw - The untrusted definition (config/package JSON, or a test input).
 * @param source - Where it came from, for error attribution.
 * @returns The validated definition (shape-preserving — no injected defaults).
 * @throws PragmaError CONFIG_ERROR describing the first violation.
 */
export function parsePackDefinition(
  raw: unknown,
  source: string,
): PackDefinition {
  const result = definitionSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") ?? "<root>";
    throw PragmaError.configError(
      `Invalid story in ${source} at ${path}: ${issue?.message ?? "unknown error"}`,
    );
  }
  return result.data as PackDefinition;
}
