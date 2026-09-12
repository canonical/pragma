import plural from "../plural.js";
import canonicalSlice from "../query/canonicalSlice.js";
import type { Query } from "../query/types.js";
import type { SourceRefusal } from "../result/types.js";
import type { SourceCapabilities } from "./types.js";

const refusal = (
  part: SourceRefusal["part"],
  code: SourceRefusal["code"],
  reason: string,
  field: string | null = null,
  operator: SourceRefusal["operator"] = null,
): SourceRefusal => ({ part, code, field, operator, reason });

/**
 * Decide whether a source can execute a request from its declaration
 * alone, collecting one structured refusal per unexecutable term. Pure, so
 * a refusal costs no round trip, and total, so a control sees every reason
 * at once rather than the first.
 *
 * Sort and group are all-or-nothing over their terms: an ordering carrying
 * one unsupported term is refused whole, never truncated. What a
 * declaration cannot express — which cursor pages are reachable, which
 * combinations one endpoint rejects — is the source's own `refuses`, and
 * the binding runs both.
 */
export default function supportsRequest(
  capabilities: SourceCapabilities,
  query: Query,
): readonly SourceRefusal[] {
  // Canonicalizing first deduplicates addresses and fixes the order, so
  // one query always produces the same refusals.
  const slice = canonicalSlice(query.slice);
  const { window } = query;
  const refusals: SourceRefusal[] = [];

  for (const predicate of slice.filter) {
    const operators = Object.hasOwn(capabilities.filter, predicate.field)
      ? capabilities.filter[predicate.field]
      : undefined;
    if (operators === undefined) {
      refusals.push(
        refusal(
          "filter",
          "undeclared-field",
          `field "${predicate.field}" cannot be filtered`,
          predicate.field,
          predicate.operator,
        ),
      );
    } else if (!operators.includes(predicate.operator)) {
      refusals.push(
        refusal(
          "filter",
          "undeclared-operator",
          `field "${predicate.field}" cannot be filtered with ${predicate.operator}`,
          predicate.field,
          predicate.operator,
        ),
      );
    }
  }

  if (slice.search !== null && capabilities.search === null) {
    refusals.push(
      refusal("search", "undeclared-field", "this source cannot search"),
    );
  }

  const { terms } = capabilities.sort;
  if (terms !== null && slice.sort.length > terms) {
    refusals.push(
      // A ceiling of zero is still a ceiling: one code covers both, so a
      // control reacts to "too many terms" without a second case.
      refusal(
        "sort",
        "too-many-terms",
        terms === 0
          ? "this source cannot sort"
          : `this source orders by at most ${plural(terms, "term")}`,
      ),
    );
  }
  // Collected beside the arity refusal, not instead of it: an ordering over
  // a source's arity must not hide that one of its terms names no sortable
  // field either. A source that cannot sort at all says so once, because
  // every term of every ordering would repeat it.
  for (const term of terms === 0 ? [] : slice.sort) {
    if (!capabilities.sort.fields.includes(term.field)) {
      refusals.push(
        refusal(
          "sort",
          "undeclared-field",
          `field "${term.field}" cannot be sorted`,
          term.field,
        ),
      );
    }
  }

  const { depth } = capabilities.group;
  if (slice.group.length > depth) {
    refusals.push(
      refusal(
        "group",
        "too-deep",
        depth === 0
          ? "this source cannot group"
          : `this source groups by at most ${plural(depth, "level")}`,
      ),
    );
  }
  for (const term of depth === 0 ? [] : slice.group) {
    if (!capabilities.group.fields.includes(term.field)) {
      refusals.push(
        refusal(
          "group",
          "undeclared-field",
          `field "${term.field}" cannot be grouped`,
          term.field,
        ),
      );
    }
  }

  if (window.collapsed.length > 0 && !capabilities.group.collapse) {
    refusals.push(
      refusal(
        "window",
        "collapse-unsupported",
        "this source cannot leave collapsed groups out of a page",
      ),
    );
  }

  if (capabilities.pagination.mode === "offset" && window.cursor !== null) {
    refusals.push(
      refusal(
        "window",
        "unreachable-page",
        "this source pages by number and reaches no page by token",
      ),
    );
  }

  return Object.freeze(refusals);
}
