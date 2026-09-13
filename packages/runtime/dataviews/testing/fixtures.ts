/**
 * Declaration fixtures for tests: a source that can execute nothing, and a
 * builder that overrides one member of it. Kept in one place so a new
 * capability member does not have to be spelled into ninety test files.
 */

import { createSchema } from "../src/lib/schema/index.js";
import {
  declareCapabilities,
  type SourceCapabilities,
} from "../src/lib/source/index.js";

/**
 * A source declaring nothing executable: every request is refused. Built
 * the way a source builds its own, so the fixture and the refusing defaults
 * cannot drift apart; `declareCapabilities.test.ts` pins what they are.
 */
export const NOTHING_DECLARED: SourceCapabilities = declareCapabilities(
  createSchema([]),
  {},
);

/** `NOTHING_DECLARED` with the named members replaced. */
export const declare = (
  overrides: Partial<SourceCapabilities>,
): SourceCapabilities => ({ ...NOTHING_DECLARED, ...overrides });

/** A sort block over the given fields, limited to `terms` (none by default) and undocumented. */
export const declareSort = (
  fields: readonly string[],
  terms: number | null = null,
): SourceCapabilities["sort"] => ({
  fields,
  terms,
  default: [],
  tiebreak: "opaque",
  collation: null,
});
