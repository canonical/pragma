import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../hardening/index.js";
import {
  connectionFromPage,
  emptyConnection,
  fromBase64,
  isEntity,
  paginateUriWindow,
  toBase64,
  toConnection,
  unwrapEntities,
} from "./connection.js";

const items = (uris: string[]) => uris.map((uri) => ({ uri }));

describe("toConnection", () => {
  it("returns all items without arguments", () => {
    const connection = toConnection(items(["b", "a", "c"]), {});
    expect(connection.edges.map((e) => e.node.uri)).toEqual(["a", "b", "c"]);
    expect(connection.pageInfo.hasNextPage).toBe(false);
    expect(connection.pageInfo.hasPreviousPage).toBe(false);
  });

  it("paginates forward with first/after", () => {
    const page1 = toConnection(items(["a", "b", "c"]), { first: 2 });
    expect(page1.edges.map((e) => e.node.uri)).toEqual(["a", "b"]);
    expect(page1.pageInfo.hasNextPage).toBe(true);
    const page2 = toConnection(items(["a", "b", "c"]), {
      first: 2,
      after: page1.pageInfo.endCursor,
    });
    expect(page2.edges.map((e) => e.node.uri)).toEqual(["c"]);
    expect(page2.pageInfo.hasNextPage).toBe(false);
  });

  it("paginates backward with last/before", () => {
    const lastPage = toConnection(items(["a", "b", "c"]), { last: 2 });
    expect(lastPage.edges.map((e) => e.node.uri)).toEqual(["b", "c"]);
    expect(lastPage.pageInfo.hasPreviousPage).toBe(true);
    const before = toConnection(items(["a", "b", "c"]), {
      last: 2,
      before: toBase64("c"),
    });
    expect(before.edges.map((e) => e.node.uri)).toEqual(["a", "b"]);
  });

  it("throws on negative first/last (connection spec)", () => {
    expect(() => toConnection(items(["a"]), { first: -1 })).toThrow(
      /non-negative/,
    );
    expect(() => toConnection(items(["a"]), { last: -1 })).toThrow(
      /non-negative/,
    );
  });

  it("returns zero edges for last: 0 (not the whole list)", () => {
    const connection = toConnection(items(["a", "b"]), { last: 0 });
    expect(connection.edges).toHaveLength(0);
  });

  it("preserves upstream order when presorted", () => {
    const connection = toConnection(items(["z", "a"]), {}, true);
    expect(connection.edges.map((e) => e.node.uri)).toEqual(["z", "a"]);
  });

  it("ignores unknown cursors", () => {
    const connection = toConnection(items(["a", "b"]), {
      after: toBase64("nope"),
    });
    expect(connection.edges).toHaveLength(2);
  });

  it("ignores an unknown before cursor", () => {
    const connection = toConnection(items(["a", "b"]), {
      before: toBase64("nope"),
    });
    expect(connection.edges).toHaveLength(2);
  });
});

describe("page-size hardening (clamp)", () => {
  const many = (n: number) =>
    items(
      Array.from({ length: n }, (_, i) => `u${String(i).padStart(4, "0")}`),
    );

  it("imposes the default page size when neither first nor last is given", () => {
    const connection = toConnection(many(200), {});
    expect(connection.edges).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(connection.pageInfo.hasNextPage).toBe(true);
  });

  it("caps an over-large first at the ceiling", () => {
    expect(toConnection(many(200), { first: 10_000 }).edges).toHaveLength(
      MAX_PAGE_SIZE,
    );
  });

  it("clamps the URI window in paginateUriWindow as well", () => {
    const uris = Array.from({ length: 200 }, (_, i) => `u${i}`);
    expect(paginateUriWindow(uris, {}).window).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(paginateUriWindow(uris, { first: 10_000 }).window).toHaveLength(
      MAX_PAGE_SIZE,
    );
  });
});

describe("paginateUriWindow", () => {
  const uris = ["a", "b", "c", "d"];

  it("trims the window at a before cursor", () => {
    const page = paginateUriWindow(uris, { before: toBase64("c"), first: 10 });
    expect(page.window).toEqual(["a", "b"]);
    expect(page.hasNextPage).toBe(false);
  });

  it("ignores an unknown before cursor", () => {
    const page = paginateUriWindow(uris, {
      before: toBase64("zzz"),
      first: 10,
    });
    expect(page.window).toEqual(uris);
  });

  it("ignores an unknown after cursor", () => {
    const page = paginateUriWindow(uris, { after: toBase64("zzz"), first: 10 });
    expect(page.window).toEqual(uris);
  });

  it("windows the tail with last (and reports a previous page)", () => {
    const page = paginateUriWindow(uris, { last: 2 });
    expect(page.window).toEqual(["c", "d"]);
    expect(page.hasPreviousPage).toBe(true);
  });

  it("combines after and last", () => {
    const page = paginateUriWindow(uris, { after: toBase64("a"), last: 2 });
    expect(page.window).toEqual(["c", "d"]);
    expect(page.hasPreviousPage).toBe(true);
  });

  it("throws on negative first/last (connection spec)", () => {
    expect(() => paginateUriWindow(uris, { first: -1 })).toThrow(
      /non-negative/,
    );
    expect(() => paginateUriWindow(uris, { last: -1 })).toThrow(/non-negative/);
  });
});

describe("base64 platform-neutral fallback", () => {
  it("round-trips via btoa/atob when Buffer is absent", () => {
    const saved = globalThis.Buffer;
    try {
      // @ts-expect-error — force the non-Buffer (Workers/browser) branch.
      globalThis.Buffer = undefined;
      const encoded = toBase64("ds:global.component.button");
      expect(fromBase64(encoded)).toBe("ds:global.component.button");
      expect(fromBase64("!!!not-base64!!!")).toBe("");
    } finally {
      globalThis.Buffer = saved;
    }
  });
});

describe("helpers", () => {
  it("base64 round-trips and tolerates garbage", () => {
    expect(fromBase64(toBase64("ds:global.component.button"))).toBe(
      "ds:global.component.button",
    );
    expect(typeof fromBase64("!!!")).toBe("string");
  });

  it("emptyConnection has the full pageInfo shape", () => {
    const connection = emptyConnection();
    expect(connection.edges).toEqual([]);
    expect(connection.pageInfo.startCursor).toBeNull();
  });

  it("isEntity filters nulls and Errors from loadMany results", () => {
    const entity = { uri: "x", typename: "T", triples: new Map() };
    expect([entity, null, new Error("boom")].filter(isEntity)).toEqual([
      entity,
    ]);
  });

  it("unwrapEntities rethrows batch errors and drops nulls", () => {
    const entity = { uri: "x", typename: "T", triples: new Map() };
    expect(unwrapEntities([entity, null])).toEqual([entity]);
    expect(() => unwrapEntities([entity, new Error("store down")])).toThrow(
      "store down",
    );
  });

  it("encodes a null uri as the empty-string cursor", () => {
    // Embedded blank-node entities carry uri: null → toBase64("") cursor.
    const page = {
      window: [],
      hasNextPage: false,
      hasPreviousPage: false,
      totalCount: 0,
    };
    const connection = connectionFromPage([{ uri: null }], page);
    expect(connection.edges[0]?.cursor).toBe(toBase64(""));
  });

  it("yields null cursors for an empty hydrated page", () => {
    const page = {
      window: [],
      hasNextPage: false,
      hasPreviousPage: false,
      totalCount: 0,
    };
    const connection = connectionFromPage([], page);
    expect(connection.edges).toEqual([]);
    expect(connection.pageInfo.startCursor).toBeNull();
    expect(connection.pageInfo.endCursor).toBeNull();
  });

  it("sorts and cursors null uris (toConnection ?? '' fallbacks)", () => {
    // Two null uris exercise both sides of the comparator's ?? "" fallbacks.
    const connection = toConnection(
      [{ uri: null }, { uri: null }, { uri: "a" }],
      {},
    );
    expect(connection.edges.map((e) => e.node.uri)).toEqual([null, null, "a"]);
    expect(connection.edges[0]?.cursor).toBe(toBase64(""));
  });
});

describe("totalCount", () => {
  it("counts the full item set regardless of pagination", () => {
    const all = toConnection(items(["a", "b", "c"]), {});
    expect(all.totalCount).toBe(3);
    const page = toConnection(items(["a", "b", "c"]), {
      first: 1,
      after: toBase64("a"),
    });
    expect(page.edges).toHaveLength(1);
    expect(page.totalCount).toBe(3);
  });

  it("carries the pre-window total through paginateUriWindow", () => {
    const page = paginateUriWindow(["a", "b", "c", "d"], { first: 2 });
    expect(page.window).toEqual(["a", "b"]);
    expect(page.totalCount).toBe(4);
    const connection = connectionFromPage(items([...page.window]), page);
    expect(connection.totalCount).toBe(4);
  });

  it("is zero on the empty connection", () => {
    expect(emptyConnection().totalCount).toBe(0);
  });
});
