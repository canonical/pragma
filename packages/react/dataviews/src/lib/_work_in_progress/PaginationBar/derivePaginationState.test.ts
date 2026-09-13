import {
  type CollectionState,
  type Count,
  createDataViewsProvider,
  createSchema,
  DEFAULT_WINDOW,
  type PageCursors,
  type ResultWindow,
  type SourceCapabilities,
  type SourceCounts,
  type SourcePage,
} from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import { countExactly } from "../../../../testing/fixtures.js";
import derivePaginationState from "./derivePaginationState.js";

const schema = createSchema([
  { field: "status", kind: "choices", options: ["failed", "ready"] },
]);

const on = (page: number, size: number): ResultWindow => ({
  ...DEFAULT_WINDOW,
  page,
  size,
});

const atLeast = (value: number): Count => ({ kind: "at-least", value });
const unknown: Count = { kind: "unknown" };

/** Counts where only `pageable` — the one the bar pages over — is claimed. */
const counting = (pageable: Count): SourceCounts => ({
  pageable,
  matched: unknown,
  total: unknown,
});

type Settled = {
  readonly rows: number;
  /** What the source says it can see; nothing counted by default. */
  readonly pageable?: Count;
  /** The source's own word on a further page. */
  readonly more?: boolean | null;
  /** The tokens the page handed back; none for an offset source. */
  readonly cursors?: PageCursors | null;
};

const pageOf = ({
  rows,
  pageable = unknown,
  more = null,
  cursors = null,
}: Settled): SourcePage => ({
  rows: Array.from({ length: rows }, (_unused, at) => ({ id: `m${at}` })),
  groups: null,
  counts: counting(pageable),
  more,
  cursors,
});

/** A forward cursor source: pages are reached only through its tokens. */
const FORWARD_CURSORS: SourceCapabilities["pagination"] = {
  kind: "cursor",
  backward: false,
  durable: false,
};

/**
 * A provider's snapshot on `window`: settled with `settled` when given, and
 * with a replacement for the next page in flight when `pending` is set.
 */
const snapshot = (
  window: ResultWindow,
  settled?: Settled,
  pending = false,
): CollectionState<object> => {
  const provider = createDataViewsProvider({ schema, window });
  if (settled !== undefined) {
    const requestId = provider.refresh();
    if (requestId === null) {
      throw new Error("expected a refresh request");
    }
    provider.complete(requestId, {
      status: "succeeded",
      page: pageOf(settled),
    });
  }
  if (pending) {
    provider.navigateWindow({ page: window.page + 1 });
  }
  return provider.state.get();
};

describe("derivePaginationState", () => {
  it("claims nothing before the first results", () => {
    expect(derivePaginationState(snapshot(on(1, 5)), [5])).toMatchObject({
      page: 1,
      size: 5,
      shown: null,
      total: null,
      pages: null,
      hasNext: false,
      sizes: [5],
    });
  });

  it("counts the pages an exact pageable count makes", () => {
    const state = derivePaginationState(
      snapshot(on(2, 5), { rows: 5, pageable: countExactly(12) }),
      [5],
    );
    expect(state).toMatchObject({ shown: 5, total: 12, pages: 3 });
    expect(state.hasNext).toBe(true);
    expect(state.back).toBe(1);
  });

  it("offers no Next from the last page a count declares", () => {
    const state = derivePaginationState(
      snapshot(on(3, 5), { rows: 2, pageable: countExactly(12) }),
      [5],
    );
    expect(state.hasNext).toBe(false);
    expect(state.back).toBe(2);
  });

  it("takes a lower bound for no total at all", () => {
    // Counting to "at least 40" is not counting the result.
    expect(
      derivePaginationState(
        snapshot(on(1, 5), { rows: 5, pageable: atLeast(40) }),
        [5],
      ),
    ).toMatchObject({ shown: 5, total: null, pages: null });
  });

  it("takes an unknown count for no total", () => {
    expect(
      derivePaginationState(
        snapshot(on(1, 5), { rows: 5, pageable: unknown }),
        [5],
      ),
    ).toMatchObject({ total: null, pages: null });
  });

  it("keeps one page for an empty collection", () => {
    expect(
      derivePaginationState(
        snapshot(on(1, 5), { rows: 0, pageable: countExactly(0) }),
        [5],
      ).pages,
    ).toBe(1);
  });

  it("takes the page's own word on a further page over a full page", () => {
    expect(
      derivePaginationState(snapshot(on(1, 5), { rows: 5, more: false }), [5])
        .hasNext,
    ).toBe(false);
    expect(
      derivePaginationState(snapshot(on(1, 5), { rows: 4, more: true }), [5])
        .hasNext,
    ).toBe(true);
  });

  it("guesses from a full page only where the source says nothing", () => {
    expect(
      derivePaginationState(snapshot(on(1, 5), { rows: 5, more: null }), [5])
        .hasNext,
    ).toBe(true);
    expect(
      derivePaginationState(snapshot(on(1, 5), { rows: 4, more: null }), [5])
        .hasNext,
    ).toBe(false);
  });

  it("steps back from past the last page to the last one there is", () => {
    expect(
      derivePaginationState(
        snapshot(on(9, 5), { rows: 0, pageable: countExactly(12) }),
        [5],
      ).back,
    ).toBe(3);
  });

  it("claims no count or total for a replacement in flight", () => {
    const state = derivePaginationState(
      snapshot(
        on(1, 5),
        { rows: 5, pageable: countExactly(12), more: true },
        true,
      ),
      [5],
    );
    expect(state).toMatchObject({ page: 2, shown: null, total: null });
    // Neither the count nor the source's word describes the pending page.
    expect(state.hasNext).toBe(false);
  });

  it("names no page total where no page is reached by number", () => {
    // A forward cursor source may know exactly how many rows it has and
    // still reach no page but the next one, so the count is shown and the
    // page total, which would name destinations, is not.
    const state = derivePaginationState(
      snapshot(on(1, 5), { rows: 5, pageable: countExactly(12) }),
      [5],
      FORWARD_CURSORS,
    );
    expect(state.total).toBe(12);
    expect(state.pages).toBe(null);
    expect(state.back).toBe(0);
  });

  it("takes Next from the token the page handed back, before any guess", () => {
    const withToken = derivePaginationState(
      snapshot(on(1, 5), {
        rows: 5,
        more: false,
        cursors: { next: "c:m4", previous: null },
      }),
      [5],
      FORWARD_CURSORS,
    );
    // The page is full and `more` says there is none: the token has the
    // last word, in both directions.
    expect(withToken.hasNext).toBe(true);
    expect(withToken.nextCursor).toBe("c:m4");
    expect(withToken.backCursor).toBe(null);

    const spent = derivePaginationState(
      snapshot(on(1, 5), {
        rows: 5,
        more: true,
        cursors: { next: null, previous: "c:m0" },
      }),
      [5],
      FORWARD_CURSORS,
    );
    expect(spent.hasNext).toBe(false);
    expect(spent.nextCursor).toBe(null);
    expect(spent.backCursor).toBe("c:m0");
  });

  it("carries no token for a source that pages by number", () => {
    // The page may hand tokens back all the same; an offset source reaches
    // its pages by number, and would refuse one of its own tokens.
    const state = derivePaginationState(
      snapshot(on(1, 5), {
        rows: 5,
        pageable: countExactly(12),
        cursors: { next: "c:m4", previous: "c:m0" },
      }),
      [5],
      { kind: "offset" },
    );
    expect(state.pages).toBe(3);
    expect(state.nextCursor).toBe(null);
    expect(state.backCursor).toBe(null);
    // And the page total, not the token, is what says a page follows.
    expect(state.hasNext).toBe(true);
  });

  it("offers each size once, the applied one always among them", () => {
    expect(
      derivePaginationState(snapshot(on(1, 25)), [50, 10, 50]).sizes,
    ).toEqual([10, 25, 50]);
    expect(
      derivePaginationState(snapshot(on(1, 25)), [25, 50, 25]).sizes,
    ).toEqual([25, 50]);
  });
});
