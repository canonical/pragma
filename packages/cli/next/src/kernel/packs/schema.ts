/**
 * The zod pack-definition validator — the single gate for DYNAMIC (config- and
 * package-declared) packs and the parity round-trip tests. It replaces the old
 * ~1,000-line hand validator with a schema plus a handful of cross-field
 * refinements that encode the source rule (§3): `type` XOR `types`, a
 * graphql-sourced lookup names its fragment target, SPARQL expands stay
 * single-hop, GraphQL fields reject property paths, and every disclosure `level`
 * names a declared canonical level.
 *
 * zod lives here and ONLY here in the pack layer, imported lazily (never on the
 * `--help`/`__complete` fast path). Bundled packs are authored in-repo and typed
 * by TypeScript, so `collect` skips validation for them (per-source skip); this
 * runs for config/package packs and in tests.
 */

import { z } from "zod";
import { DETAIL_LEVELS } from "../../constants.js";
import { PragmaError } from "../error/PragmaError.js";
import type { PackDefinition } from "./types.js";

const NOUN_PATTERN = /^[a-z][a-z0-9-]*$/;
const FILTER_PARAM_PATTERN = /^[a-z][a-z0-9]*$/;
const FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const GRAPHQL_NAME_PATTERN = /^[_A-Za-z][_0-9A-Za-z]*$/;
/** A prefixed name (`ds:Thing`), a property path of them, or an absolute IRI. */
const TERM_PATTERN =
  /^(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/[^<>"\s]+|[A-Za-z][\w-]*:[^/<>"\s]+(?:\/[A-Za-z][\w-]*:[^/<>"\s]+)*)$/;

/** Params a filter/verb may not claim (they are the shared read vocabulary). */
const RESERVED_PARAMS = new Set(["search", "detail", "name", "count"]);

const term = z.string().regex(TERM_PATTERN, "must be a prefixed name or IRI");
const graphqlName = z.string().regex(GRAPHQL_NAME_PATTERN);
const fieldName = z.string().regex(FIELD_PATTERN);

const columnSchema = z
  .object({ field: fieldName, label: z.string().optional() })
  .strict();

const filterSchema = z
  .object({
    param: z.string().regex(FILTER_PARAM_PATTERN),
    variable: fieldName,
    values: z.array(z.string()).min(1).optional(),
    description: z.string().optional(),
  })
  .strict()
  .refine((f) => !RESERVED_PARAMS.has(f.param), {
    message: "filter param is a reserved name",
  });

const searchSchema = z
  .object({
    variables: z.array(fieldName).min(1),
    description: z.string().optional(),
  })
  .strict();

const emptyRecoverySchema = z
  .object({
    message: z.string().min(1),
    cli: z
      .string()
      .startsWith("pragma ", 'emptyRecovery.cli must be a "pragma " command')
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
    verb: z.string().regex(NOUN_PATTERN),
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

const lookupSchema = z
  .object({
    source: z.enum(["sparql", "graphql"]).optional(),
    by: term,
    type: term.optional(),
    description: z.string().optional(),
    toolDescription: z.string().optional(),
    types: z.array(term).min(1).optional(),
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
    noun: z.string().regex(NOUN_PATTERN),
    description: z.string().optional(),
    toolDescription: z.string().optional(),
    list: listSchema.optional(),
    verbs: z.array(verbSchema).min(1).optional(),
    lookup: lookupSchema.optional(),
  })
  .strict()
  .superRefine((def, ctx) => {
    if (!def.list && !def.lookup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'a pack must declare at least one of "list" or "lookup".',
      });
    }
    if (
      def.list &&
      !/^\s*(?:PREFIX\s+[^\n]*\n\s*)*SELECT\s/i.test(def.list.query)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '"list.query" must be a SPARQL SELECT query.',
        path: ["list", "query"],
      });
    }
    if (def.lookup) refineLookup(def.lookup, ctx);
  });

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
