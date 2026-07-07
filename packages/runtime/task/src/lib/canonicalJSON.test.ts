import { describe, expect, it } from "vitest";
import canonicalJSON from "./canonicalJSON.js";

describe("canonicalJSON", () => {
  describe("primitives", () => {
    it("encodes null", () => {
      expect(canonicalJSON(null)).toBe("null");
    });

    it("encodes undefined with a bare token distinct from the string", () => {
      expect(canonicalJSON(undefined)).toBe("undefined");
      expect(canonicalJSON("undefined")).toBe('"undefined"');
    });

    it("encodes booleans", () => {
      expect(canonicalJSON(true)).toBe("true");
      expect(canonicalJSON(false)).toBe("false");
    });

    it("encodes bigint with an n suffix", () => {
      expect(canonicalJSON(42n)).toBe("42n");
    });

    it("encodes strings quoted and escaped", () => {
      expect(canonicalJSON("hi")).toBe('"hi"');
      expect(canonicalJSON('a"b')).toBe('"a\\"b"');
    });
  });

  describe("numbers", () => {
    it("encodes a finite number", () => {
      expect(canonicalJSON(42)).toBe("42");
      expect(canonicalJSON(-3.5)).toBe("-3.5");
    });

    it("encodes NaN distinct from the string", () => {
      expect(canonicalJSON(Number.NaN)).toBe("NaN");
      expect(canonicalJSON("NaN")).toBe('"NaN"');
    });

    it("encodes positive and negative Infinity", () => {
      expect(canonicalJSON(Number.POSITIVE_INFINITY)).toBe("Infinity");
      expect(canonicalJSON(Number.NEGATIVE_INFINITY)).toBe("-Infinity");
    });

    it("distinguishes negative zero from zero", () => {
      expect(canonicalJSON(-0)).toBe("-0");
      expect(canonicalJSON(0)).toBe("0");
    });
  });

  describe("collections", () => {
    it("encodes arrays preserving order", () => {
      expect(canonicalJSON([3, 1, 2])).toBe("[3,1,2]");
    });

    it("sorts object keys deterministically regardless of insertion order", () => {
      expect(canonicalJSON({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
      expect(canonicalJSON({ b: 1, a: 2 })).toBe(canonicalJSON({ a: 2, b: 1 }));
    });

    it("tags and sorts Map entries by canonical key", () => {
      const map = new Map<string, number>([
        ["b", 1],
        ["a", 2],
      ]);
      expect(canonicalJSON(map)).toBe('Map{"a":2,"b":1}');
    });

    it("tags and sorts Set elements", () => {
      expect(canonicalJSON(new Set([3, 1, 2]))).toBe("Set{1,2,3}");
    });

    it("tags typed arrays by their constructor", () => {
      expect(canonicalJSON(new Uint8Array([1, 2, 3]))).toBe(
        "Uint8Array(1,2,3)",
      );
    });

    it("recurses into nested structures", () => {
      expect(canonicalJSON({ xs: [{ b: 2, a: 1 }], n: null })).toBe(
        '{"n":null,"xs":[{"a":1,"b":2}]}',
      );
    });
  });

  describe("fail-closed behaviour", () => {
    it("throws on a function", () => {
      expect(() => canonicalJSON(() => undefined)).toThrow(TypeError);
    });

    it("throws on a symbol", () => {
      expect(() => canonicalJSON(Symbol("x"))).toThrow(TypeError);
    });

    it("throws when a property getter throws an Error", () => {
      const obj = {
        get bad(): unknown {
          throw new Error("boom");
        },
      };
      expect(() => canonicalJSON(obj)).toThrow(/boom/);
    });

    it("throws when a property getter throws a non-Error", () => {
      const obj = {
        get bad(): unknown {
          throw "raw";
        },
      };
      expect(() => canonicalJSON(obj)).toThrow(/raw/);
    });
  });
});
