// =============================================================================
// Confining two text passes to a Turtle document's syntax.
//
// Both passes over a source — harvesting the prefix prologue and escaping
// channel-dotted local names — are regular expressions, and a regular
// expression cannot tell a prefixed name from the same characters inside an
// `rdfs:comment`. The corpus is documentation prose about a graph, so those
// characters DO appear in its annotations. These tests pin that comments,
// string literals and IRI references are read as opaque data: never harvested
// from, never rewritten.
// =============================================================================

import { describe, expect, it } from "vitest";
import { blankTurtleProse, mapTurtleSyntax } from "./turtleText.js";

const upper = (syntax: string) => syntax.toUpperCase();

describe("mapTurtleSyntax", () => {
  it("transforms syntax and leaves a comment alone", () => {
    expect(mapTurtleSyntax("ab # cd\nef", upper)).toBe("AB # cd\nEF");
  });

  it("leaves each of the four string forms alone", () => {
    expect(mapTurtleSyntax('a "b" c', upper)).toBe('A "b" C');
    expect(mapTurtleSyntax("a 'b' c", upper)).toBe("A 'b' C");
    expect(mapTurtleSyntax('a """b\nb""" c', upper)).toBe('A """b\nb""" C');
    expect(mapTurtleSyntax("a '''b\nb''' c", upper)).toBe("A '''b\nb''' C");
  });

  it("leaves an escaped quote inside a string from ending it", () => {
    expect(mapTurtleSyntax('a "b\\"c" d', upper)).toBe('A "b\\"c" D');
  });

  it("leaves an IRI reference alone", () => {
    expect(mapTurtleSyntax("a <http://e.example/x> b", upper)).toBe(
      "A <http://e.example/x> B",
    );
  });

  it("does not read a hash inside an IRI reference as a comment", () => {
    // The IRI opens first, so it swallows the `#`; `b` is still syntax.
    expect(mapTurtleSyntax("a <http://e.example/o#t> b", upper)).toBe(
      "A <http://e.example/o#t> B",
    );
  });

  it("does not read a quote inside a comment as a string", () => {
    expect(mapTurtleSyntax('a # "b\nc', upper)).toBe('A # "b\nC');
  });

  it("leaves a bare less-than that opens no IRI reference as syntax", () => {
    expect(mapTurtleSyntax("a < b", upper)).toBe("A < B");
  });
});

describe("blankTurtleProse", () => {
  it("blanks a comment, keeping the newline and the offsets", () => {
    const source = "ab # cd\nef";
    const blanked = blankTurtleProse(source);
    expect(blanked).toBe("ab     \nef");
    expect(blanked).toHaveLength(source.length);
  });

  it("blanks a string literal", () => {
    expect(blankTurtleProse('a "bc" d')).toBe("a      d");
  });

  it("keeps an IRI reference, which a directive has to match through", () => {
    expect(blankTurtleProse("@prefix ex: <https://e.example/> .")).toBe(
      "@prefix ex: <https://e.example/> .",
    );
  });
});
