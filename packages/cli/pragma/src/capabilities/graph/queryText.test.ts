/**
 * Pasting pragma's own names into `graph query`, and reading its complaints.
 *
 * The graph's local names are not SPARQL `PN_LOCAL`: `graph inspect` prints
 * `ds:global.component.button` and `variable list` prints
 * `dt:s4/web/--color-text`, and pasting either into `graph query` produced a
 * five-line Unicode-range dump pointing at line 16 of a query the caller wrote
 * one line of. These pin both halves of the fix — the expansion, and the
 * position the failure is reported at.
 */

import { describe, expect, it } from "vitest";
import {
  expandPrefixedNames,
  findUnknownPrefixes,
  trimQueryError,
} from "./queryText.js";

const PREFIXES = {
  ds: "https://ds.canonical.com/",
  dt: "https://dt.canonical.com/",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
};

const expand = (sparql: string): string =>
  expandPrefixedNames(sparql, PREFIXES).text;

describe("expandPrefixedNames — the names pragma itself hands out", () => {
  it("expands a dotted local part the grammar cannot carry", () => {
    expect(
      expand("SELECT ?p ?o WHERE { ds:global.component.button ?p ?o } LIMIT 2"),
    ).toBe(
      "SELECT ?p ?o WHERE { <https://ds.canonical.com/global.component.button> ?p ?o } LIMIT 2",
    );
  });

  it("expands a local part with slashes and a leading dash", () => {
    expect(expand("SELECT ?o WHERE { dt:s4/web/--color-text ?p ?o }")).toBe(
      "SELECT ?o WHERE { <https://dt.canonical.com/s4/web/--color-text> ?p ?o }",
    );
  });

  it("leaves a name the grammar already carries exactly as written", () => {
    const query = "SELECT ?n WHERE { ?c a ds:Component ; rdfs:label ?n }";
    expect(expand(query)).toBe(query);
    expect(expandPrefixedNames(query, PREFIXES).rewritten).toBe(false);
  });

  it("keeps the caller's statement terminator out of the name", () => {
    expect(expand("SELECT ?p WHERE { ds:a.b.c ?p ?o. }")).toBe(
      "SELECT ?p WHERE { <https://ds.canonical.com/a.b.c> ?p ?o. }",
    );
  });

  it("never rewrites inside a string literal", () => {
    for (const quote of ['"', "'", '"""']) {
      const query = `SELECT ?s WHERE { ?s ?p ${quote}ds:x/y${quote} }`;
      expect(expand(query)).toBe(query);
    }
  });

  it("never rewrites inside a comment or an IRI already written out", () => {
    const query = [
      "# see ds:global.component.button",
      "SELECT ?p WHERE { <https://ds.canonical.com/a.b.c> ?p ?o }",
    ].join("\n");
    expect(expand(query)).toBe(query);
  });

  it("leaves a prefix the query will not be parsed with alone", () => {
    const query = "SELECT ?p WHERE { nope:a.b.c ?p ?o }";
    expect(expand(query)).toBe(query);
  });

  it("keeps a property path a path, expanding each step it must", () => {
    expect(expand("SELECT ?o WHERE { ?s ds:a.b/ds:c ?o }")).toBe(
      "SELECT ?o WHERE { ?s <https://ds.canonical.com/a.b>/ds:c ?o }",
    );
  });

  it("expands against the namespace the caller declared, not the shipped one", () => {
    expect(
      expand(
        "PREFIX ds: <https://other.test/> SELECT ?p WHERE { ds:a.b ?p ?o }",
      ),
    ).toContain("<https://other.test/a.b>");
  });

  it("declines a local part that would break the IRI it is put in", () => {
    const query = "SELECT ?p WHERE { ds:a\\.b ?p ?o }";
    expect(expand(query)).toBe(query);
  });
});

describe("trimQueryError — the caller's own position", () => {
  const DUMP =
    'error at 16:41: expected one of "!", "$", "(", ":", "<", "?", "^", "a", [\'%\'],\n' +
    "['-' | '0' ..= '9' | '\\u{00B7}' | '\\u{0300}'..='\\u{036F}'],\n" +
    "['A' ..= 'Z' | 'a' ..= 'z' | '\\u{00C0}'..='\\u{00D6}']";

  it("subtracts the PREFIX lines the caller never wrote", () => {
    expect(trimQueryError("error at 16:41: expected OPTIONAL", 15, false)).toBe(
      "error at line 1, column 41: expected OPTIONAL",
    );
  });

  it("drops the column when names were expanded (the line moved sideways)", () => {
    expect(trimQueryError("error at 17:41: expected OPTIONAL", 15, true)).toBe(
      "error at line 2: expected OPTIONAL",
    );
  });

  it("cuts the expected-token dump to one line", () => {
    const message = trimQueryError(DUMP, 15, false);
    expect(message.split("\n")).toHaveLength(1);
    expect(message.length).toBeLessThan(200);
    expect(message.startsWith("error at line 1, column 41:")).toBe(true);
  });

  it("passes a message it cannot position through, still on one line", () => {
    expect(trimQueryError("unknown prefix\n  ds", 15, false)).toBe(
      "unknown prefix ds",
    );
  });
});

describe("findUnknownPrefixes — only a prefix that can explain the emptiness", () => {
  const KNOWN = { ds: "https://ds.canonical.com/" };
  const BAD = "https://example.invalid/t#";

  it("reports a declared, used prefix whose IRI is no namespace of the graph", () => {
    expect(
      findUnknownPrefixes(
        `PREFIX tok: <${BAD}> PREFIX ds: <https://ds.canonical.com/> SELECT ?c WHERE { ?c tok:uses ds:x }`,
        KNOWN,
      ),
    ).toEqual([{ prefix: "tok", iri: BAD }]);
  });

  it("ignores a PREFIX in a comment or inside a string literal", () => {
    expect(
      findUnknownPrefixes(
        `# PREFIX tok: <${BAD}>\nSELECT ?s WHERE { ?s ds:label "PREFIX tok: <${BAD}> tok:x" }`,
        KNOWN,
      ),
    ).toEqual([]);
  });

  it("ignores a declared prefix the body never uses", () => {
    expect(
      findUnknownPrefixes(
        `PREFIX tok: <${BAD}> SELECT ?s WHERE { ?s a ds:Component }`,
        KNOWN,
      ),
    ).toEqual([]);
  });

  it("does not judge a relative IRI, which BASE resolves", () => {
    expect(
      findUnknownPrefixes(
        "BASE <https://ds.canonical.com/> PREFIX rel: <tokens/> SELECT ?s WHERE { ?s rel:p ?o }",
        KNOWN,
      ),
    ).toEqual([]);
  });

  it("reports the default prefix too, when the body uses it", () => {
    expect(
      findUnknownPrefixes(
        `PREFIX : <${BAD}> SELECT ?s WHERE { ?s :p ?o }`,
        KNOWN,
      ),
    ).toEqual([{ prefix: "", iri: BAD }]);
  });
});
