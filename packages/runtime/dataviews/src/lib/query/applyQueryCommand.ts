import { predicateAddress } from "./canonicalSlice.js";
import collapseSortTerms from "./collapseSortTerms.js";
import sliceEquals from "./sliceEquals.js";
import type {
  GroupPath,
  Predicate,
  QueryCommand,
  QueryCommandResult,
  ResultWindow,
  Slice,
} from "./types.js";

/** Commands that address the query rather than the window. */
type SliceCommand = Exclude<
  QueryCommand,
  { kind: "navigateWindow" } | { kind: "setCollapsed" }
>;

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
    default:
      return `unknown predicate operator ${String(predicate.operator)}`;
  }
};

/**
 * The window a changed result set is read through: the first page, from the
 * start, so a token minted for one page never addresses another. Collapse
 * survives, because a collapsed group is still that group after a filter.
 */
const firstPage = (window: ResultWindow): ResultWindow => ({
  ...window,
  page: 1,
  cursor: null,
});

const setPredicate = (slice: Slice, predicate: Predicate): Slice => ({
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

const collapsedEquals = (
  a: readonly GroupPath[],
  b: readonly GroupPath[],
): boolean =>
  a.length === b.length &&
  a.every(
    (path, index) =>
      path.length === b[index].length &&
      path.every((key, depth) => Object.is(key, b[index][depth])),
  );

/**
 * Apply one addressed query command as a coherent transition: a changed
 * query resets the window to its first page, window-only commands leave the
 * query untouched, and a semantically unchanged edit changes nothing.
 * Commands that violate the bounded grammar (empty fields, wrong arities,
 * non-finite numbers, non-positive or fractional window values, an empty
 * cursor token) are rejected with the input state unchanged.
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
    if (command.cursor === "") {
      return rejected(
        slice,
        window,
        "cursor must not be empty; use null to clear it",
      );
    }
    // A token addresses one page start, so moving without supplying one
    // leaves no token behind to describe the page that was left.
    const cursor =
      command.cursor !== undefined
        ? command.cursor
        : page === window.page && size === window.size
          ? window.cursor
          : null;
    return {
      status: "accepted",
      slice,
      window: { ...window, page, size, cursor },
      sliceChanged: false,
      windowChanged:
        page !== window.page ||
        size !== window.size ||
        cursor !== window.cursor,
    };
  }

  if (command.kind === "setCollapsed") {
    if (collapsedEquals(window.collapsed, command.collapsed)) {
      return {
        status: "accepted",
        slice,
        window,
        sliceChanged: false,
        windowChanged: false,
      };
    }
    // Collapse changes which rows the pages hold, exactly as a filter does,
    // so the window returns to its first page for the same reason.
    return {
      status: "accepted",
      slice,
      window: {
        ...firstPage(window),
        collapsed: command.collapsed.map((path) => [...path]),
      },
      sliceChanged: false,
      windowChanged: true,
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
      sliceChanged: false,
      windowChanged: false,
    };
  }
  // Grouping decides what a collapsed path names, so changing it leaves no
  // path that still means what it meant.
  const nextWindow =
    command.kind === "setGroup"
      ? { ...firstPage(window), collapsed: [] }
      : firstPage(window);
  return {
    status: "accepted",
    slice: nextSlice,
    window: nextWindow,
    sliceChanged: true,
    windowChanged:
      window.page !== nextWindow.page ||
      window.cursor !== nextWindow.cursor ||
      window.collapsed.length !== nextWindow.collapsed.length,
  };
}

const commandRejection = (command: SliceCommand): string | null => {
  switch (command.kind) {
    case "setPredicate":
      return predicateRejection(command.predicate);
    case "removePredicate":
      // Removal may address out-of-grammar predicates (for example one
      // installed by an unvalidated adopt): it cleans up by exact address
      // and cannot create a collision.
      return null;
    case "setSort":
      return command.sort.some((term) => term.field === "")
        ? "sort term field must not be empty"
        : null;
    case "setGroup":
      return command.group.some((term) => term.field === "")
        ? "group term field must not be empty"
        : null;
    default:
      return null;
  }
};

const applyToSlice = (slice: Slice, command: SliceCommand): Slice => {
  switch (command.kind) {
    case "setPredicate":
      return setPredicate(slice, command.predicate);
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
    case "setSearch":
      return {
        ...slice,
        search: command.search === "" ? null : command.search,
      };
    case "setSort":
      // Collapsed here as well as in canonicalization, so the query the
      // coordinator holds is the one the user can read back off the URL.
      return { ...slice, sort: collapseSortTerms(command.sort) };
    case "setGroup":
      return {
        ...slice,
        group: command.group.map((term) => ({ field: term.field })),
      };
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
