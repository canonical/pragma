import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "#hardening";
import {
  emptyConnection,
  fromBase64,
  isEntity,
  paginateUriWindow,
  toBase64,
  toConnection,
  unwrapEntities,
} from "./connection.js";

const items = (uris: string[]) => uris.map((uri) => ({ uri }));

describe("toConnection (§5.4, KG.18)", () => {
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
});
