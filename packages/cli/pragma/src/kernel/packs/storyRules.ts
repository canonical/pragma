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
  type PackDefinition,
  type PackList,
  RESERVED_VARIABLE_PREFIX,
} from "./types.js";

/** The message a filter declaring neither `values` nor a `vocabulary` gets. */
const FILTER_VOCABULARY_MESSAGE =
  'a filter must declare "values" or a "vocabulary" query — a value-free filter with neither has nothing to check a caller\'s value against';

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
    if (filter.values === undefined && filter.vocabulary === undefined) {
      issues.push({
        path: [...path, "filters", index],
        message: FILTER_VOCABULARY_MESSAGE,
      });
    }
  }
  const constrained = [
    ...(shape.filters ?? []).map((filter) => filter.variable),
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
  }
  for (const [index, verb] of (definition.verbs ?? []).entries()) {
    issues.push(...listShapeIssues(verb, ["verbs", index]));
  }
  return issues;
}
