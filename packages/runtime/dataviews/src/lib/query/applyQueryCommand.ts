import { predicateAddress } from "./canonicalSlice.js";
import sliceEquals from "./sliceEquals.js";
import type {
  Predicate,
  QueryCommand,
  QueryCommandResult,
  ResultWindow,
  Slice,
} from "./types.js";

/** Commands that address the query rather than the window. */
type QueryMemberCommand = Exclude<QueryCommand, { kind: "navigateWindow" }>;

/** Validate one predicate against the bounded grammar. */
const predicateRejection = (predicate: Predicate): string | null => {
  if (predicate.field === "") {
    return "predicate field must not be empty";
  }
  if (predicate.field.includes("\u0000")) {
    return "predicate field must not contain NUL characters";
  }
  if (
    predicate.operands.some(
      (operand) => typeof operand === "number" && !Number.isFinite(operand),
    )
  ) {
    return "predicate operands must be finite numbers";
  }
  switch (predicate.operator) {
    case "eq":
      return predicate.operands.length > 0
        ? null
        : "eq predicate needs at least one operand";
    case "gte":
    case "lte":
      return predicate.operands.length === 1
        ? null
        : `${predicate.operator} predicate needs exactly one operand`;
    case "isSet":
      return predicate.operands.length === 0
        ? null
        : "isSet predicate takes no operands";
  }
};

const firstPage = (window: ResultWindow): ResultWindow => ({
  ...window,
  page: 1,
});

const replacePredicate = (slice: Slice, predicate: Predicate): Slice => ({
  ...slice,
  filter: [
    ...slice.filter.filter(
      (existing) =>
        predicateAddress(existing.field, existing.operator) !==
        predicateAddress(predicate.field, predicate.operator),
    ),
    predicate,
  ],
});

/**
 * Apply one addressed query command as a coherent transition: a changed
 * query resets the window to the first page, window-only commands leave the
 * query untouched, and a semantically unchanged edit changes nothing.
 * Commands that violate the bounded grammar (empty fields, wrong arities,
 * non-finite numbers, non-positive or fractional window values) are rejected
 * with the input state unchanged.
 */
export default function applyQueryCommand(
  slice: Slice,
  window: ResultWindow,
  command: QueryCommand,
): QueryCommandResult {
  if (command.kind === "navigateWindow") {
    const page = command.page ?? window.page;
    const size = command.size ?? window.size;
    if (!Number.isInteger(page) || page < 1) {
      return rejected(slice, window, "page must be a positive integer");
    }
    if (!Number.isInteger(size) || size < 1) {
      return rejected(slice, window, "size must be a positive integer");
    }
    return {
      status: "accepted",
      slice,
      window: { page, size },
      queryChanged: false,
      windowChanged: page !== window.page || size !== window.size,
    };
  }

  const rejection = commandRejection(command);
  if (rejection !== null) {
    return rejected(slice, window, rejection);
  }

  const nextSlice = applyToSlice(slice, command);
  if (sliceEquals(slice, nextSlice)) {
    // A semantically unchanged edit is not a request and not a history entry.
    return {
      status: "accepted",
      slice,
      window,
      queryChanged: false,
      windowChanged: false,
    };
  }
  return {
    status: "accepted",
    slice: nextSlice,
    window: firstPage(window),
    queryChanged: true,
    windowChanged: window.page !== 1,
  };
}
const commandRejection = (command: QueryMemberCommand): string | null => {
  switch (command.kind) {
    case "replacePredicate":
      return predicateRejection(command.predicate);
    case "removePredicate":
      // Removal may address out-of-grammar predicates (for example one
      // installed by an unvalidated adopt): it cleans up by exact address
      // and cannot create a collision.
      return null;
    case "replaceSort":
      return command.sort.some((term) => term.field === "")
        ? "sort term field must not be empty"
        : null;
    case "setGroup":
      return command.group === ""
        ? "group must not be empty; use null to clear it"
        : null;
    default:
      return null;
  }
};
const applyToSlice = (slice: Slice, command: QueryMemberCommand): Slice => {
  switch (command.kind) {
    case "replacePredicate":
      return replacePredicate(slice, command.predicate);
    case "removePredicate": {
      const address = predicateAddress(command.field, command.operator);
      return {
        ...slice,
        filter: slice.filter.filter(
          (predicate) =>
            predicateAddress(predicate.field, predicate.operator) !== address,
        ),
      };
    }
    case "replaceSearch":
      return {
        ...slice,
        search: command.search === "" ? null : command.search,
      };
    case "replaceSort":
      return { ...slice, sort: [...command.sort] };
    case "setGroup":
      return { ...slice, group: command.group };
  }
};

const rejected = (
  slice: Slice,
  window: ResultWindow,
  reason: string,
): QueryCommandResult => ({
  status: "rejected",
  reason,
  slice,
  window,
});
