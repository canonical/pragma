import { describe, expect, it } from "vitest";
import parseJsonc from "./parseJsonc.js";

describe("parseJsonc", () => {
  describe("plain JSON", () => {
    it("parses a JSON object", () => {
      expect(parseJsonc('{"a":1,"b":"two"}')).toEqual({ a: 1, b: "two" });
    });

    it("returns an empty object for empty or whitespace-only text", () => {
      expect(parseJsonc("")).toEqual({});
      expect(parseJsonc("   \n\t  ")).toEqual({});
    });
  });

  describe("JSONC tolerance", () => {
    it("strips a line comment", () => {
      expect(parseJsonc('// header\n{"a":1}')).toEqual({ a: 1 });
    });

    it("strips a block comment", () => {
      expect(parseJsonc('/* note */ {"a":1}')).toEqual({ a: 1 });
    });

    it("treats a comment-only file as an empty object", () => {
      expect(parseJsonc("// just a comment")).toEqual({});
    });

    it("drops a trailing comma before a closing brace or bracket", () => {
      expect(parseJsonc('{"a":1,}')).toEqual({ a: 1 });
      expect(parseJsonc('{"a":[1,2,]}')).toEqual({ a: [1, 2] });
    });

    it("keeps a comma that separates members", () => {
      expect(parseJsonc('{"a":1,"b":2}')).toEqual({ a: 1, b: 2 });
    });

    it("drops a trailing comma even when a comment sits before the closer", () => {
      expect(parseJsonc('{"a":1, // last\n}')).toEqual({ a: 1 });
      expect(parseJsonc('{"a":1, /* last */ }')).toEqual({ a: 1 });
    });
  });

  describe("string contents are preserved", () => {
    it("does not strip // inside a string (a URL)", () => {
      expect(parseJsonc('{"url":"http://x//y"}')).toEqual({
        url: "http://x//y",
      });
    });

    it("does not treat a comma inside a string as trailing", () => {
      expect(parseJsonc('{"a":"x,}"}')).toEqual({ a: "x,}" });
    });

    it("preserves an escaped quote inside a string", () => {
      expect(parseJsonc('{"a":"x\\"y"}')).toEqual({ a: 'x"y' });
    });
  });

  describe("fails closed (returns undefined) on non-objects", () => {
    it("rejects genuinely malformed text", () => {
      expect(parseJsonc("not json")).toBeUndefined();
    });

    it("rejects a JSON array at the top level", () => {
      expect(parseJsonc("[1,2,3]")).toBeUndefined();
    });

    it("rejects a top-level primitive", () => {
      expect(parseJsonc("42")).toBeUndefined();
      expect(parseJsonc("null")).toBeUndefined();
    });

    it("rejects a string that ends mid-escape", () => {
      expect(parseJsonc('{"a":"x\\')).toBeUndefined();
    });

    it("rejects a comma whose lookahead runs off the end", () => {
      expect(parseJsonc("[1,2,")).toBeUndefined();
    });

    it("rejects an unterminated comment before a would-be closer", () => {
      expect(parseJsonc('{"a":1,/*')).toBeUndefined();
    });
  });
});
