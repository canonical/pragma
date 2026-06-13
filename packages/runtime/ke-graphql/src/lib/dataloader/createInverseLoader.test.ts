import type { QueryResult, Term } from "@canonical/ke";
import { describe, expect, it, vi } from "vitest";
import type { MappedIR, NamespaceInfo, QueryFn } from "#shared";
import createInverseLoader from "./createInverseLoader.js";

const NS = "https://ds.canonical.com/";

const namespaces = new Map<string, NamespaceInfo>([
  ["ds", { prefix: "ds", uri: NS, classCount: 0, propertyCount: 0 }],
]);

const named = (value: string): Term => ({ termType: "NamedNode", value });
const literal = (value: string): Term => ({ termType: "Literal", value });

const mapped = { namespaces } as unknown as MappedIR;

const select = (termBindings: Record<string, Term>[]): QueryResult =>
  ({
    type: "select",
    variables: [],
    bindings: [],
    termBindings,
  }) as QueryResult;

const ask = (): QueryResult => ({ type: "ask", result: true }) as QueryResult;

const key = (property: string, object: string) => `${property} ${object}`;

describe("createInverseLoader", () => {
  it("evicts the keys of a failed batch and rethrows", async () => {
    let calls = 0;
    const query: QueryFn = vi.fn(async () => {
      calls += 1;
      throw new Error("store down");
    });
    const loader = createInverseLoader(query, mapped, new Map());

    await expect(loader.load(key(`${NS}of`, "ds:x"))).rejects.toThrow(
      "store down",
    );
    await expect(loader.load(key(`${NS}of`, "ds:x"))).rejects.toThrow(
      "store down",
    );
    expect(calls).toBe(2);
  });

  it("skips SELECT bindings that are not all NamedNodes (each operand)", async () => {
    const query: QueryFn = async () =>
      select([
        // A valid all-NamedNode row.
        {
          property: named(`${NS}of`),
          object: named(`${NS}x`),
          subject: named(`${NS}a`),
        },
        // property is a Literal → first operand of the || fails.
        {
          property: literal("nope"),
          object: named(`${NS}x`),
          subject: named(`${NS}b`),
        },
        // object is a Literal → second operand fails.
        {
          property: named(`${NS}of`),
          object: literal("nope"),
          subject: named(`${NS}c`),
        },
        // subject is a Literal → third operand fails.
        {
          property: named(`${NS}of`),
          object: named(`${NS}x`),
          subject: literal("nope"),
        },
      ]);
    const loader = createInverseLoader(query, mapped);
    // The prefixed object expands to the full IRI for byKey lookup.
    expect(await loader.load(key(`${NS}of`, "ds:x"))).toEqual([`${NS}a`]);
  });

  it("returns an empty list for a non-select result", async () => {
    // result.type !== "select" → byKey stays empty → the ?? [] fallback fires.
    const query: QueryFn = async () => ask();
    const loader = createInverseLoader(query, mapped);
    expect(await loader.load(key(`${NS}of`, "ds:x"))).toEqual([]);
  });

  it("falls back to the raw object when its prefix is unknown (toFull undefined)", async () => {
    const query: QueryFn = vi.fn(async (q: string) => {
      // toFull("zz:thing") is undefined for an unregistered prefix → ?? object
      // keeps "zz:thing" as the SPARQL object.
      expect(q).toContain("<zz:thing>");
      return select([
        {
          property: named(`${NS}of`),
          object: named("zz:thing"),
          subject: named(`${NS}a`),
        },
      ]);
    });
    const loader = createInverseLoader(query, mapped);
    expect(await loader.load(key(`${NS}of`, "zz:thing"))).toEqual([`${NS}a`]);
  });
});
