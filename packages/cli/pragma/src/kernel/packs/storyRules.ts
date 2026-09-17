/**
 * The declaration rules a list story must satisfy to be COMPILABLE, checked
 * without zod so that every story is held to them — including the
 * distribution's own.
 *
 * WHY NOT IN THE GRAMMAR. `schema.ts` is the zod gate, and it runs for config-
 * and package-declared stories only: `capabilities/distribution.ts` compiles
 * `pragma.conf.ts` statically and never revalidates it, deliberately, because
 * zod on the `--help`/`__complete` fast path is latency every invocation pays.
 * The consequence was that three rules whose violation is a CONFIG_ERROR — a
 * query a page cannot wrap, a filtered variable the query does not project, a
 * filter with nothing to admit a value against — were declaration-time refusals
 * for a third-party author and FIRST-CALL failures for the distribution. The
 * same rule reaching one tier and missing the other is the shape this domain
 * keeps closing (see `compileStoryModule`), so the rules live here, in pure
 * string work the fast path can afford, and the grammar delegates to them
 * rather than restating them.
 *
 * These are the COMPILABILITY rules only. Everything about a definition's
 * SHAPE — required fields, enums, mutual exclusions, reserved param names —
 * stays in the zod schema, which is where a shape is best expressed and which
 * a statically typed `pragma.conf.ts` already satisfies by construction.
 */

import { readAuthorQuery } from "./sparql/authorQuery.js";
import {
  ENTITY_VARIABLE,
  type PackDefinition,
  type PackList,
  type PackTierScope,
  RESERVED_VARIABLE_PREFIX,
  TIER_PARAM,
} from "./types.js";

/** The message a filter declaring nothing to admit a value against gets. */
const FILTER_VOCABULARY_MESSAGE =
  'a filter must declare "values", a "vocabulary" query or a "noun" — a value-free filter with none has nothing to check a caller\'s value against';

/** One reason a declaration cannot be compiled, and where in it to look. */
export interface StoryIssue {
  /** The path into the definition, in the grammar's own field names. */
  readonly path: readonly (string | number)[];
  /** What is wrong, in the author's terms. */
  readonly message: string;
}

/**
 * Every compilability rule one list-shaped body breaks.
 *
 * @param shape - A `list` or an extra list-shaped verb.
 * @param path - Where that body sits in the definition, for the issue paths.
 * @returns The issues: each filter's own rule first, at its own `filters.N`
 *   path, then the query's. A caller reporting only the first (zod, and
 *   `compileStoryModule`) therefore names the most local fault it can, and the
 *   query rules stop at the first one that makes the rest unjudgeable — a
 *   projection cannot be checked against a query the reader could not read.
 */
export function listShapeIssues(
  shape: PackList,
  path: readonly (string | number)[],
): StoryIssue[] {
  const issues: StoryIssue[] = [];
  for (const [index, filter] of (shape.filters ?? []).entries()) {
    if (
      filter.values === undefined &&
      filter.vocabulary === undefined &&
      filter.noun === undefined
    ) {
      issues.push({
        path: [...path, "filters", index],
        message: FILTER_VOCABULARY_MESSAGE,
      });
    }
    if (filter.noun !== undefined && filter.entity === undefined) {
      issues.push({
        path: [...path, "filters", index],
        message:
          'a filter naming a "noun" must declare the "entity" variable its IRIs constrain',
      });
    }
  }
  const constrained = [
    ...(shape.filters ?? []).flatMap((filter) =>
      filter.entity ? [filter.variable, filter.entity] : [filter.variable],
    ),
    ...(shape.search?.variables ?? []),
  ];
  const read = readAuthorQuery(shape.query);
  if (!read.ok) {
    issues.push({
      path: [...path, "query"],
      message: `a list query must be wrappable in a page, and ${read.reason} — every list answer is one page, and a page is a wrapping SELECT over the story's own query.`,
    });
    return issues;
  }
  if (constrained.length === 0) return issues;
  if (shape.query.includes(RESERVED_VARIABLE_PREFIX)) {
    issues.push({
      path: [...path, "query"],
      message: `a filtered or searched list query may not use the reserved variable prefix "?${RESERVED_VARIABLE_PREFIX}", which the generated filter clauses bind a caller's values to. Rename it.`,
    });
  }
  const projection = read.query.projection;
  if (!projection) {
    issues.push({
      path: [...path, "query"],
      message:
        "a list declaring filters or a search must project its SELECT variables by name — the page projects the same names in the same order, which `SELECT *` cannot promise.",
    });
    return issues;
  }
  for (const variable of constrained) {
    if (!projection.includes(variable)) {
      issues.push({
        path: [...path, "query"],
        message: `"${variable}" is filtered or searched but not projected by the query (it selects ${projection.join(", ")}).`,
      });
    }
  }
  return issues;
}

/**
 * Every compilability rule a whole definition breaks, `list` and extra verbs
 * alike.
 *
 * @param definition - The definition about to be compiled.
 * @returns The issues, empty when it compiles.
 */
export function storyIssues(definition: PackDefinition): StoryIssue[] {
  const issues: StoryIssue[] = [];
  if (definition.list) {
    issues.push(...listShapeIssues(definition.list, ["list"]));
    issues.push(
      ...tierScopeIssues(definition.tierScope, definition.list, ["list"]),
    );
  }
  for (const [index, verb] of (definition.verbs ?? []).entries()) {
    issues.push(...listShapeIssues(verb, ["verbs", index]));
    issues.push(
      ...tierScopeIssues(definition.tierScope, verb, ["verbs", index]),
    );
  }
  return issues;
}

/**
 * The two rules a TIER-SCOPED noun's list-shaped body must satisfy.
 *
 * Both are the same kind of fault — a declaration that would compile and then
 * scope nothing, silently:
 *
 * - It must PROJECT its entity variable. The scope clause constrains that
 *   variable through the noun's declared `via` edge, so a body that publishes
 *   rows without it (`standard categories` projects a name and a count) is a
 *   body the scope cannot narrow. Refusing it here is the difference between a
 *   declaration error an author reads once and a list that quietly answers
 *   from every tier while its heading claims a scope.
 * - Its own filters may not claim the `tier` param, which the kernel puts on
 *   every tiered noun's reads. A story filter of that name would collide with
 *   the flag Commander has already registered — the failure mode
 *   {@link RESERVED_STORY_PARAMS} exists to prevent, conditional here because
 *   an UNSCOPED noun's `tier` filter is legitimate (`variable list --tier`
 *   filters the token graph's own `dt:tier`, which this scope does not touch).
 */
export function tierScopeIssues(
  tierScope: PackTierScope | undefined,
  shape: PackList,
  path: readonly (string | number)[],
): StoryIssue[] {
  if (!tierScope) return [];
  const issues: StoryIssue[] = [];
  for (const [index, filter] of (shape.filters ?? []).entries()) {
    if (filter.param === TIER_PARAM) {
      issues.push({
        path: [...path, "filters", index],
        message: `a tier-scoped story may not declare a "${TIER_PARAM}" filter — the kernel puts that parameter on every tiered noun's reads, and the two would collide`,
      });
    }
  }
  const read = readAuthorQuery(shape.query);
  // An unreadable query is already reported by `listShapeIssues`, and the
  // projection cannot be judged against a query nobody could read.
  if (!read.ok) return issues;
  const projection = read.query.projection;
  if (projection !== undefined && !projection.includes(ENTITY_VARIABLE)) {
    issues.push({
      path: [...path, "query"],
      message: `a tier-scoped story must project ?${ENTITY_VARIABLE} — the tier scope is compiled in as a constraint on that variable (it selects ${projection.join(", ")}).`,
    });
  }
  return issues;
}
