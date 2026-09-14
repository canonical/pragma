/**
 * The pagination facts a bar renders are decided here, from the published
 * state alone, so every binding offers the same destinations. Each case is
 * driven through a real coordinator: its requests are issued by command and
 * completed by hand with the page a source would deliver.
 */
import { describe, expect, it } from "vitest";
import {
  atLeast,
  BY_NUMBER,
  buildSettledPage,
  exactly,
  FORWARD_CURSORS,
  readIssuedRequest,
  type SettledRow,
} from "../../../testing/fixtures.js";
import {
  createQueryCoordinator,
  type QueryCoordinator,
} from "../coordinator/index.js";
import {
  DEFAULT_WINDOW,
  EMPTY_SLICE,
  type ResultWindow,
} from "../query/index.js";
import { UNKNOWN_COUNT } from "../result/index.js";
import resolvePagination from "./resolvePagination.js";

const on = (page: number, size: number): ResultWindow => ({
  ...DEFAULT_WINDOW,
  page,
  size,
});

/** A coordinator on `window`, settled with `settled` when given. */
const settled = (
  window: ResultWindow,
  page?: Parameters<typeof buildSettledPage>[0],
): QueryCoordinator<SettledRow> => {
  const coordinator = createQueryCoordinator<SettledRow>({ start: { window } });
  if (page !== undefined) {
    coordinator.complete(coordinator.refresh(), {
      status: "succeeded",
      page: buildSettledPage(page),
    });
  }
  return coordinator;
};

describe("resolvePagination", () => {
  it("claims nothing before the first results", () => {
    expect(resolvePagination(settled(on(1, 5)).state, BY_NUMBER, [5])).toEqual({
      page: 1,
      size: 5,
      shown: null,
      total: UNKNOWN_COUNT,
      pages: null,
      hasNext: false,
      back: 0,
      nextCursor: null,
      backCursor: null,
      sizes: [5],
    });
  });

  it("counts the pages an exact pageable count makes", () => {
    const facts = resolvePagination(
      settled(on(2, 5), { rows: 5, pageable: exactly(12) }).state,
      BY_NUMBER,
      [5],
    );
    expect(facts).toMatchObject({ shown: 5, total: exactly(12), pages: 3 });
    expect(facts.hasNext).toBe(true);
    expect(facts.back).toBe(1);
  });

  it("offers no Next from the last page a count declares", () => {
    const facts = resolvePagination(
      settled(on(3, 5), { rows: 2, pageable: exactly(12) }).state,
      BY_NUMBER,
      [5],
    );
    expect(facts.hasNext).toBe(false);
    expect(facts.back).toBe(2);
  });

  it("carries a lower bound as one, naming no page total from it", () => {
    // Counting to "at least 40" is not counting the result: the bound is
    // shown for what it is, and no last page is invented from it.
    expect(
      resolvePagination(
        settled(on(1, 5), { rows: 5, pageable: atLeast(40) }).state,
        BY_NUMBER,
        [5],
      ),
    ).toMatchObject({ shown: 5, total: atLeast(40), pages: null });
  });

  it("proves a later page from a lower bound past this one", () => {
    // Forty rows at least, five to a page: page two exists whatever the
    // source's word on a further page. Page eight is the bound's edge, so
    // it proves nothing there and the weaker authorities answer.
    expect(
      resolvePagination(
        settled(on(1, 5), { rows: 5, pageable: atLeast(40), more: false })
          .state,
        BY_NUMBER,
        [5],
      ).hasNext,
    ).toBe(true);
    expect(
      resolvePagination(
        settled(on(8, 5), { rows: 5, pageable: atLeast(40), more: false })
          .state,
        BY_NUMBER,
        [5],
      ).hasNext,
    ).toBe(false);
  });

  it("lets the token outrank a lower bound on a cursor source", () => {
    // Forty at least, five to a page, and the page handed back no token:
    // the bound promises a page nothing can reach, so Next is not offered.
    const facts = resolvePagination(
      settled(on(1, 5), {
        rows: 5,
        pageable: atLeast(40),
        more: true,
        cursors: { next: null, previous: null },
      }).state,
      FORWARD_CURSORS,
      [5],
    );
    expect(facts.total).toEqual(atLeast(40));
    expect(facts.hasNext).toBe(false);
    expect(facts.nextCursor).toBe(null);
  });

  it("takes an unknown count for no total", () => {
    expect(
      resolvePagination(
        settled(on(1, 5), { rows: 5, pageable: UNKNOWN_COUNT }).state,
        BY_NUMBER,
        [5],
      ),
    ).toMatchObject({ total: UNKNOWN_COUNT, pages: null });
  });

  it("keeps one page for an empty collection", () => {
    expect(
      resolvePagination(
        settled(on(1, 5), { rows: 0, pageable: exactly(0) }).state,
        BY_NUMBER,
        [5],
      ).pages,
    ).toBe(1);
  });

  it("takes the page's own word on a further page over a full page", () => {
    expect(
      resolvePagination(
        settled(on(1, 5), { rows: 5, more: false }).state,
        BY_NUMBER,
        [5],
      ).hasNext,
    ).toBe(false);
    expect(
      resolvePagination(
        settled(on(1, 5), { rows: 4, more: true }).state,
        BY_NUMBER,
        [5],
      ).hasNext,
    ).toBe(true);
  });

  it("guesses from a full page only where the source says nothing", () => {
    expect(
      resolvePagination(
        settled(on(1, 5), { rows: 5, more: null }).state,
        BY_NUMBER,
        [5],
      ).hasNext,
    ).toBe(true);
    expect(
      resolvePagination(
        settled(on(1, 5), { rows: 4, more: null }).state,
        BY_NUMBER,
        [5],
      ).hasNext,
    ).toBe(false);
  });

  it("steps back from past the last page to the last one there is", () => {
    expect(
      resolvePagination(
        settled(on(9, 5), { rows: 0, pageable: exactly(12) }).state,
        BY_NUMBER,
        [5],
      ).back,
    ).toBe(3);
  });

  it("keeps the count through a page move of the same query", () => {
    // The rows in flight are not counted as shown, but what the source
    // counted was the rows this query and size page over, which the next
    // page's rows still are: the page select keeps its list.
    const coordinator = settled(on(1, 5), {
      rows: 5,
      pageable: exactly(12),
      more: true,
    });
    coordinator.dispatch({ kind: "navigateWindow", page: 2 });
    const facts = resolvePagination(coordinator.state, BY_NUMBER, [5]);
    expect(facts).toMatchObject({
      page: 2,
      shown: null,
      total: exactly(12),
      pages: 3,
    });
    // The count says a page follows; the source's word on the page that
    // left does not carry over.
    expect(facts.hasNext).toBe(true);
  });

  it("keeps the count across a history step that respells the same query", () => {
    // Back or forward adopts the query as another object: the same query
    // by content keeps its count, and the pages it makes.
    const coordinator = settled(on(1, 5), { rows: 5, pageable: exactly(12) });
    coordinator.adopt({ slice: { ...EMPTY_SLICE }, window: on(2, 5) });
    expect(resolvePagination(coordinator.state, BY_NUMBER, [5])).toMatchObject({
      page: 2,
      shown: null,
      total: exactly(12),
      pages: 3,
    });
  });

  it("offers no spent token while the page it reaches loads", () => {
    // The token the page handed back has been used: until the next page
    // answers, nothing says where a page after it starts.
    const coordinator = settled(on(1, 5), {
      rows: 5,
      cursors: { next: "c:m4", previous: null },
    });
    coordinator.dispatch({ kind: "navigateWindow", page: 2, cursor: "c:m4" });
    expect(
      resolvePagination(coordinator.state, FORWARD_CURSORS, [5]),
    ).toMatchObject({ hasNext: false, nextCursor: null, backCursor: null });
  });

  it("guesses nothing from the page that left while its replacement loads", () => {
    const coordinator = settled(on(1, 5), { rows: 5, more: true });
    coordinator.dispatch({ kind: "navigateWindow", page: 2 });
    expect(resolvePagination(coordinator.state, BY_NUMBER, [5]).hasNext).toBe(
      false,
    );
  });

  it("drops the count when the query moves", () => {
    const coordinator = settled(on(1, 5), { rows: 5, pageable: exactly(12) });
    coordinator.dispatch({ kind: "setSearch", search: "alpha" });
    expect(resolvePagination(coordinator.state, BY_NUMBER, [5])).toMatchObject({
      shown: null,
      total: UNKNOWN_COUNT,
      pages: null,
    });
  });

  it("drops the count when the page size moves", () => {
    // Twelve rows make three pages of five and two of ten: the old count
    // still holds, the pages it made do not, so nothing is claimed until
    // the source answers for the new size.
    const coordinator = settled(on(1, 5), { rows: 5, pageable: exactly(12) });
    coordinator.dispatch({ kind: "navigateWindow", page: 1, size: 10 });
    expect(
      resolvePagination(coordinator.state, BY_NUMBER, [5, 10]),
    ).toMatchObject({ size: 10, total: UNKNOWN_COUNT, pages: null });
  });

  it("keeps the count over rows a failed page move left in view", () => {
    // The rows are an earlier page's and are not summarised as this one's;
    // the count still describes the query they belong to.
    const coordinator = settled(on(1, 5), { rows: 5, pageable: exactly(12) });
    const { requestId } = coordinator.dispatch({
      kind: "navigateWindow",
      page: 2,
    });
    coordinator.complete(readIssuedRequest(requestId), {
      status: "failed",
      failure: { reason: "offline", cause: null, transient: true },
    });
    expect(resolvePagination(coordinator.state, BY_NUMBER, [5])).toMatchObject({
      page: 2,
      shown: null,
      total: exactly(12),
      pages: 3,
    });
  });

  it("names no page total where no page is reached by number", () => {
    // A forward cursor source may know exactly how many rows it has and
    // still reach no page but the next one, so the count is shown and the
    // page total, which would name destinations, is not.
    const facts = resolvePagination(
      settled(on(1, 5), { rows: 5, pageable: exactly(12) }).state,
      FORWARD_CURSORS,
      [5],
    );
    expect(facts.total).toEqual(exactly(12));
    expect(facts.pages).toBe(null);
    expect(facts.back).toBe(0);
  });

  it("takes Next from the token the page handed back, before any guess", () => {
    const withToken = resolvePagination(
      settled(on(1, 5), {
        rows: 5,
        more: false,
        cursors: { next: "c:m4", previous: null },
      }).state,
      FORWARD_CURSORS,
      [5],
    );
    // The page is full and `more` says there is none: the token has the
    // last word, in both directions.
    expect(withToken.hasNext).toBe(true);
    expect(withToken.nextCursor).toBe("c:m4");
    expect(withToken.backCursor).toBe(null);

    const spent = resolvePagination(
      settled(on(1, 5), {
        rows: 5,
        more: true,
        cursors: { next: null, previous: "c:m0" },
      }).state,
      FORWARD_CURSORS,
      [5],
    );
    expect(spent.hasNext).toBe(false);
    expect(spent.nextCursor).toBe(null);
    expect(spent.backCursor).toBe("c:m0");
  });

  it("carries no token for a source that pages by number", () => {
    // The page may hand tokens back all the same; an offset source reaches
    // its pages by number, and would refuse one of its own tokens.
    const facts = resolvePagination(
      settled(on(1, 5), {
        rows: 5,
        pageable: exactly(12),
        cursors: { next: "c:m4", previous: "c:m0" },
      }).state,
      BY_NUMBER,
      [5],
    );
    expect(facts.pages).toBe(3);
    expect(facts.nextCursor).toBe(null);
    expect(facts.backCursor).toBe(null);
    // And the page total, not the token, is what says a page follows.
    expect(facts.hasNext).toBe(true);
  });

  it("offers each size once, the applied one always among them", () => {
    expect(
      resolvePagination(settled(on(1, 25)).state, BY_NUMBER, [50, 10, 50])
        .sizes,
    ).toEqual([10, 25, 50]);
    expect(
      resolvePagination(settled(on(1, 25)).state, BY_NUMBER, [25, 50, 25])
        .sizes,
    ).toEqual([25, 50]);
  });
});
