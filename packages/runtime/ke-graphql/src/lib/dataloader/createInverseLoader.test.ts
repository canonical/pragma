import type { QueryResult, Term } from "@canonical/ke";
import { describe, expect, it, vi } from "vitest";
import type { QueryFn } from "../shared/index.js";
import createInverseLoader from "./createInverseLoader.js";

const NS = "https://ds.canonical.com/";

const named = (value: string): Term => ({ termType: "NamedNode", value });
const literal = (value: string): Term => ({ termType: "Literal", value });

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
    const loader = createInverseLoader(query, new Map());

    await expect(loader.load(key(`${NS}of`, `${NS}x`))).rejects.toThrow(
      "store down",
    );
    await expect(loader.load(key(`${NS}of`, `${NS}x`))).rejects.toThrow(
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
    const loader = createInverseLoader(query);
    // Keys carry the absolute IRI already — nothing to expand.
    expect(await loader.load(key(`${NS}of`, `${NS}x`))).toEqual([`${NS}a`]);
  });

  it("returns an empty list for a non-select result", async () => {
    // result.type !== "select" → byKey stays empty → the ?? [] fallback fires.
    const query: QueryFn = async () => ask();
    const loader = createInverseLoader(query);
    expect(await loader.load(key(`${NS}of`, `${NS}x`))).toEqual([]);
  });
});
