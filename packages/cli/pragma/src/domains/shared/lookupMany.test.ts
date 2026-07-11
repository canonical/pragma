import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import lookupMany, { lookupToolMeta } from "./lookupMany.js";

describe("lookupMany", () => {
  it("returns all results when every query resolves", async () => {
    const result = await lookupMany(["a", "b"], async (q) => q.toUpperCase());

    expect(result.results).toEqual(["A", "B"]);
    expect(result.errors).toEqual([]);
    expect(result.meta).toEqual({ internalErrorCount: 0 });
  });

  it("collects PragmaError failures as structured error entries", async () => {
    const result = await lookupMany(["Button", "Buton"], async (q) => {
      if (q === "Buton") {
        throw PragmaError.notFound("block", q, { suggestions: ["Button"] });
      }
      return q;
    });

    expect(result.results).toEqual(["Button"]);
    expect(result.errors).toEqual([
      {
        query: "Buton",
        code: "ENTITY_NOT_FOUND",
        message: 'block "Buton" not found.',
        suggestions: ["Button"],
      },
    ]);
    expect(result.meta).toEqual({ internalErrorCount: 0 });
  });

  it("keeps N-1 results when one query throws a non-PragmaError", async () => {
    const result = await lookupMany(
      ["a", "poisoned", "c"],
      async (q): Promise<string> => {
        if (q === "poisoned") {
          throw new TypeError("cannot read properties of undefined");
        }
        return q.toUpperCase();
      },
    );

    expect(result.results).toEqual(["A", "C"]);
    expect(result.errors).toEqual([
      {
        query: "poisoned",
        code: "INTERNAL_ERROR",
        message: "Internal error: cannot read properties of undefined",
      },
    ]);
    expect(result.meta).toEqual({ internalErrorCount: 1 });
  });

  it("collects synchronous throws as INTERNAL_ERROR entries instead of rejecting", async () => {
    const lookup = (q: string): Promise<string> => {
      if (q === "sync-boom") {
        // Throws before ever returning a promise — must not escape the batch.
        throw new Error("sync failure before promise");
      }
      return Promise.resolve(q.toUpperCase());
    };

    const result = await lookupMany(["a", "sync-boom", "c"], lookup);

    expect(result.results).toEqual(["A", "C"]);
    expect(result.errors).toEqual([
      {
        query: "sync-boom",
        code: "INTERNAL_ERROR",
        message: "Internal error: sync failure before promise",
      },
    ]);
    expect(result.meta).toEqual({ internalErrorCount: 1 });
  });

  it("stringifies non-Error rejection values", async () => {
    const result = await lookupMany(["a"], async () => {
      throw "string failure";
    });

    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([
      {
        query: "a",
        code: "INTERNAL_ERROR",
        message: "Internal error: string failure",
      },
    ]);
    expect(result.meta).toEqual({ internalErrorCount: 1 });
  });

  it("counts each internal error and mixes with PragmaError entries", async () => {
    const result = await lookupMany(
      ["ok", "missing", "boom-1", "boom-2"],
      async (q): Promise<string> => {
        if (q === "missing") throw PragmaError.notFound("token", q);
        if (q.startsWith("boom")) throw new Error(q);
        return q;
      },
    );

    expect(result.results).toEqual(["ok"]);
    expect(result.errors).toHaveLength(3);
    expect(result.errors.map((e) => e.code)).toEqual([
      "ENTITY_NOT_FOUND",
      "INTERNAL_ERROR",
      "INTERNAL_ERROR",
    ]);
    expect(result.meta).toEqual({ internalErrorCount: 2 });
  });
});

describe("lookupToolMeta", () => {
  it("reports count and omits internalErrorCount when zero", async () => {
    const result = await lookupMany(["a", "b"], async (q) => q);

    expect(lookupToolMeta(result)).toEqual({ count: 2 });
  });

  it("includes internalErrorCount when at least one query failed unexpectedly", async () => {
    const result = await lookupMany(
      ["a", "boom"],
      async (q): Promise<string> => {
        if (q === "boom") throw new Error("boom");
        return q;
      },
    );

    expect(lookupToolMeta(result)).toEqual({
      count: 1,
      internalErrorCount: 1,
    });
  });

  it("tolerates hand-built results without meta", () => {
    expect(lookupToolMeta({ results: ["x"], errors: [] })).toEqual({
      count: 1,
    });
  });
});
