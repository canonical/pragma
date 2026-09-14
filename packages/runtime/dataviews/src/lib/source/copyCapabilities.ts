import type { PredicateOperator, SortTerm } from "../query/index.js";
import createBareRecord from "./createBareRecord.js";
import type {
  ActionCapabilities,
  EmptyPlacement,
  SortCapabilities,
  SourceCapabilities,
} from "./types.js";

const copyTerms = (terms: readonly SortTerm[]): readonly SortTerm[] =>
  Object.freeze(
    terms.map((term) =>
      Object.freeze({ field: term.field, direction: term.direction }),
    ),
  );

const copyEmpties = (
  empties: SortCapabilities["empties"],
): SortCapabilities["empties"] => {
  const copied = createBareRecord<EmptyPlacement>();
  for (const [field, placement] of Object.entries(empties)) {
    copied[field] = placement;
  }
  return Object.freeze(copied);
};

const copySort = (sort: SortCapabilities): SortCapabilities =>
  Object.freeze({
    fields: Object.freeze([...sort.fields]),
    terms: sort.terms,
    default: copyTerms(sort.default),
    tiebreak:
      typeof sort.tiebreak === "string"
        ? sort.tiebreak
        : copyTerms(sort.tiebreak),
    empties: copyEmpties(sort.empties),
    collation: sort.collation,
  });

const copyActions = (
  actions: Readonly<Record<string, ActionCapabilities>>,
): Readonly<Record<string, ActionCapabilities>> => {
  const copied = createBareRecord<ActionCapabilities>();
  for (const [name, action] of Object.entries(actions)) {
    copied[name] = Object.freeze({
      targets: action.targets,
      limit: action.limit,
    });
  }
  return Object.freeze(copied);
};

const copyFilter = (
  filter: SourceCapabilities["filter"],
): SourceCapabilities["filter"] => {
  const copied = createBareRecord<readonly PredicateOperator[]>();
  for (const [field, operators] of Object.entries(filter)) {
    copied[field] = Object.freeze([...operators]);
  }
  return Object.freeze(copied);
};

/**
 * A frozen, prototype-free copy of a source's declaration, so it cannot
 * change under the binding after construction and every control reads the
 * same offer.
 */
export default function copyCapabilities(
  capabilities: SourceCapabilities,
): SourceCapabilities {
  return Object.freeze({
    filter: copyFilter(capabilities.filter),
    search:
      capabilities.search === null
        ? null
        : Object.freeze({
            fields: Object.freeze([...capabilities.search.fields]),
          }),
    sort: copySort(capabilities.sort),
    group: Object.freeze({
      fields: Object.freeze([...capabilities.group.fields]),
      levels: capabilities.group.levels,
      summaries: capabilities.group.summaries,
      collapse: capabilities.group.collapse,
    }),
    counts: Object.freeze({
      pageable: capabilities.counts.pageable,
      matched: capabilities.counts.matched,
      total: capabilities.counts.total,
    }),
    pagination:
      capabilities.pagination.kind === "offset"
        ? Object.freeze({ kind: "offset" as const })
        : Object.freeze({
            kind: "cursor" as const,
            backward: capabilities.pagination.backward,
            durable: capabilities.pagination.durable,
          }),
    selection: Object.freeze({ scope: capabilities.selection.scope }),
    actions: copyActions(capabilities.actions),
  });
}
