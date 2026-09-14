import type { Collection } from "../collection/index.js";
import type { PredicateOperator } from "../query/index.js";
import type { SchemaFieldDefinition } from "../schema/index.js";
import copyCapabilities from "./copyCapabilities.js";
import createBareRecord from "./createBareRecord.js";
import type {
  CapabilityDeclaration,
  EmptyPlacement,
  SourceCapabilities,
} from "./types.js";

/**
 * Build the complete, frozen capability record a source publishes from
 * what its author declares, typed against the collection's schema.
 *
 * Every member the author leaves out is refused — no filter on that
 * field, no search, no sort, counts unknown, no actions — so the
 * unanswered case is the safe case; a member the schema cannot check, an
 * unknown field or an operator its kind does not accept, is refused with
 * a thrown error at construction rather than at the first request. The
 * grouping and selection blocks are not declarable: no shipped source can
 * execute either, and the record refuses both.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function declareCapabilities<
  const TFields extends readonly SchemaFieldDefinition[],
  TRow extends object,
>(
  collection: Collection<TFields, TRow>,
  declaration: CapabilityDeclaration<TFields>,
): SourceCapabilities {
  const { schema } = collection;
  const filter: Record<string, readonly PredicateOperator[]> = {};
  // The declaration's keys are optional, which the compiler reads as an
  // object that may lack them, not as a record. A TypeScript author cannot
  // write one `undefined`; a JavaScript author still may, and is read as
  // having left it out.
  const declaredFilter = (declaration.filter ?? {}) as Readonly<
    Record<string, readonly PredicateOperator[] | true | undefined>
  >;
  for (const [field, operators] of Object.entries(declaredFilter)) {
    if (operators === undefined) {
      continue;
    }
    if (schema.findField(field) === undefined) {
      throw new Error(`the schema has no field "${field}" to filter`);
    }
    const accepted = schema.listOperators(field);
    const declared = operators === true ? accepted : operators;
    for (const operator of declared) {
      if (!accepted.includes(operator)) {
        throw new Error(`field "${field}" cannot be filtered with ${operator}`);
      }
    }
    if (declared.length > 0) {
      filter[field] = declared;
    }
  }
  const sort = declaration.sort;
  const sortable = sort?.fields ?? [];
  for (const field of sortable) {
    if (schema.findField(field) === undefined) {
      throw new Error(`the schema has no field "${field}" to sort by`);
    }
  }
  for (const term of sort?.default ?? []) {
    if (!sortable.includes(term.field)) {
      throw new Error(
        `the default ordering names "${term.field}", which is not sortable`,
      );
    }
  }
  // Optional keys again, read as a record; an entry left undefined is left out.
  const declaredEmpties = (sort?.empties ?? {}) as Readonly<
    Record<string, EmptyPlacement | undefined>
  >;
  // Prototype-free, as the record the source publishes is.
  const empties = createBareRecord<EmptyPlacement>();
  for (const [field, placement] of Object.entries(declaredEmpties)) {
    if (placement === undefined) {
      continue;
    }
    if (placement !== "first" && placement !== "last") {
      throw new Error(
        `empty values of "${field}" are placed "${String(placement)}", which is neither first nor last`,
      );
    }
    if (!sortable.includes(field)) {
      throw new Error(
        `empty values of "${field}" are placed, which is not sortable`,
      );
    }
    empties[field] = placement;
  }
  return copyCapabilities({
    filter,
    search:
      declaration.search === undefined || declaration.search.length === 0
        ? null
        : { fields: declaration.search },
    sort: {
      fields: sortable,
      terms: sort === undefined ? 0 : sort.terms,
      default: sort?.default ?? [],
      tiebreak: sort?.tiebreak ?? "none",
      empties,
      collation: sort?.collation ?? null,
    },
    group: { fields: [], levels: 0, summaries: "none", collapse: false },
    counts: {
      pageable: declaration.counts?.pageable ?? "unknown",
      matched: declaration.counts?.matched ?? "unknown",
      total: declaration.counts?.total ?? "unknown",
    },
    pagination: declaration.pagination ?? { kind: "offset" },
    selection: { scope: "explicit" },
    actions: declaration.actions ?? {},
  });
}
