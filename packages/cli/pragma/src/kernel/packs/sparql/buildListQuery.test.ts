/**
 * The generated list query — the SHAPE it composes, and the one property that
 * shape exists to guarantee: a caller's value never reaches query text.
 *
 * These are text assertions on purpose. The behavioural half — that the
 * compiled predicates answer exactly what the row predicates answered — is
 * pinned against a real store in `compile.test.ts` and, over the shipped
 * corpus, in `listQuery.shipped.exec.test.ts`. What can only be asserted here
 * is what the text does NOT contain: no author query edited, no user string
 * spliced into a predicate, no page bounds inside the author's own modifiers.
 */

import { describe, expect, it } from "vitest";
import { PragmaError } from "../../error/index.js";
import { buildListQuery } from "./buildListQuery.js";
import { readProjection } from "./projection.js";

/** The author query every case below wraps: aggregate, grouped, ordered. */
const AUTHORED = [
  "SELECT ?uri ?name ?category",
  '       (GROUP_CONCAT(DISTINCT ?slug; SEPARATOR=" ") AS ?categories)',
  "WHERE {",
  "  ?uri a cs:CodeStandard ; rdfs:label ?name .",
  "  OPTIONAL { ?uri cs:hasCategory/cs:slug ?category . }",
  "  OPTIONAL { ?uri cs:hasCategory/skos:broader*/cs:slug ?slug . }",
  "}",
  "GROUP BY ?uri ?name ?category",
  "ORDER BY ?name",
].join("\n");

const window = { limit: 10, offset: 0 };
const label = "pragma.conf.ts";

describe("readProjection", () => {
  it("reads bare variables and aliased expressions, in author order", () => {
    expect(readProjection(AUTHORED)).toEqual([
      "uri",
      "name",
      "category",
      "categories",
    ]);
  });

  it("reads through DISTINCT and through a nested projection expression", () => {
    expect(
      readProjection(
        "SELECT DISTINCT ?a (COALESCE(IF(?d = 0, 1, 1 - (0.2 * ?d)), 0) AS ?rank) WHERE { ?a ds:x ?d }",
      ),
    ).toEqual(["a", "rank"]);
  });

  it("answers undefined for SELECT * — the one projection it cannot enumerate", () => {
    expect(readProjection("SELECT * WHERE { ?s ?p ?o }")).toBeUndefined();
  });

  it("is not fooled by a brace or a WHERE inside a string literal", () => {
    expect(
      readProjection(
        'SELECT ?a (REPLACE(?a, "WHERE {", ")") AS ?b) WHERE { ?a ds:x ?y }',
      ),
    ).toEqual(["a", "b"]);
  });
});

describe("buildListQuery — nothing to filter", () => {
  it("appends the page to the author query, untouched", () => {
    const query = buildListQuery({
      query: AUTHORED,
      predicates: [],
      window: { limit: 10, offset: 20 },
      label,
    });
    // The author's text is a PREFIX of the result: the page is a solution
    // modifier after their own ORDER BY, which is where SPARQL applies it.
    expect(query).toBe(`${AUTHORED}\nLIMIT 10 OFFSET 20`);
  });

  it("omits OFFSET 0, which is the no-op it looks like", () => {
    const query = buildListQuery({
      query: AUTHORED,
      predicates: [],
      window,
      label,
    });
    expect(query).toBe(`${AUTHORED}\nLIMIT 10`);
  });
});

describe("buildListQuery — something to filter", () => {
  const filtered = buildListQuery({
    query: AUTHORED,
    predicates: [{ variable: "categories", match: "set", terms: ["testing"] }],
    search: { variables: ["name", "description"], term: "unit" },
    window: { limit: 10, offset: 30 },
    label,
  });

  it("wraps the author query in a sub-select, verbatim", () => {
    expect(filtered).toContain(`  {\n${AUTHORED}\n  }`);
    // The author's own GROUP BY and ORDER BY survive inside the sub-select,
    // which is the whole reason a `set` filter can be expressed at all: the
    // cell it reads is what that GROUP BY computed.
    expect(filtered).toContain("GROUP BY ?uri ?name ?category");
    expect(filtered).toContain("ORDER BY ?name");
  });

  it("projects the author's own variables, in the author's own order", () => {
    expect(
      filtered.startsWith("SELECT ?uri ?name ?category ?categories\n"),
    ).toBe(true);
    // `SELECT *` here would return alphabetised binding keys, changing the
    // shape of every JSON answer for no reason a caller asked for.
    expect(filtered).not.toContain("SELECT *");
  });

  it("carries the page on the WRAPPER, after the predicates", () => {
    expect(filtered.trimEnd().endsWith("LIMIT 10 OFFSET 30")).toBe(true);
    // Not inside the author query, where it would cut before the filter ran.
    expect(filtered.indexOf("FILTER EXISTS")).toBeLessThan(
      filtered.lastIndexOf("LIMIT 10 OFFSET 30"),
    );
  });

  it("binds each value through VALUES rather than into the predicate", () => {
    expect(filtered).toContain('VALUES ?__pragmaFilter0 { "testing" }');
    expect(filtered).toContain('VALUES ?__pragmaSearch { "unit" }');
    // The comparison names the bound variable — the literal appears once, in
    // the VALUES row, and nowhere inside an expression.
    expect(filtered).toContain("LCASE(?__pragmaFilter0)");
    expect(filtered.match(/"testing"/g)).toHaveLength(1);
  });

  it("wraps each VALUES in FILTER EXISTS, so a union cannot duplicate a row", () => {
    // Joined into the group, `VALUES` with two rows would pair every row with
    // every requested value, and a `set` cell carrying both would come back
    // twice. EXISTS makes it a per-row boolean instead.
    const union = buildListQuery({
      query: AUTHORED,
      predicates: [
        { variable: "categories", match: "set", terms: ["testing", "react"] },
      ],
      window,
      label,
    });
    expect(union).toContain(
      'FILTER EXISTS { VALUES ?__pragmaFilter0 { "testing" "react" }',
    );
  });
});

/**
 * The generated query with every string LITERAL blanked out — what is left is
 * the query TEXT, which is the only place a caller's value could do harm.
 *
 * Asserting on the raw text is not enough: an escaped value legitimately
 * CONTAINS the words a caller hoped to inject, so counting `UNION` over the
 * whole string counts their own string back at them.
 */
function queryTextOnly(query: string): string {
  return query.replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

describe("buildListQuery — injection safety", () => {
  it("escapes a value that tries to close its own literal and add a clause", () => {
    const hostile = '" } UNION { ?uri a ds:Secret . VALUES ?x { "';
    const query = buildListQuery({
      query: AUTHORED,
      predicates: [{ variable: "category", match: "exact", terms: [hostile] }],
      window,
      label,
    });
    // The quote is escaped, so the literal never closes and the injected
    // pattern stays a string. One VALUES block, one FILTER EXISTS, no UNION.
    expect(query).toContain(
      '{ "\\" } UNION { ?uri a ds:Secret . VALUES ?x { \\"" }',
    );
    // With the literals blanked, the query text carries exactly the one
    // VALUES block the builder minted, and no UNION at all.
    const text = queryTextOnly(query);
    expect(text.match(/VALUES/g)).toHaveLength(1);
    expect(text).not.toContain("UNION");
    expect(text).not.toContain("ds:Secret");
  });

  it("escapes a newline, so a value cannot start a line of query text", () => {
    const query = buildListQuery({
      query: AUTHORED,
      predicates: [
        { variable: "category", match: "exact", terms: ["a\nLIMIT 1"] },
      ],
      window,
      label,
    });
    expect(query).toContain('{ "a\\nLIMIT 1" }');
    expect(queryTextOnly(query).match(/LIMIT/g)).toHaveLength(1);
  });

  it("escapes a search term the same way", () => {
    const query = buildListQuery({
      query: AUTHORED,
      predicates: [],
      search: { variables: ["name"], term: '"' },
      window,
      label,
    });
    expect(query).toContain('{ "\\"" }');
  });
});

describe("buildListQuery — a story it cannot serve", () => {
  it("refuses a filterable story whose SELECT projects *", () => {
    expect(() =>
      buildListQuery({
        query: "SELECT * WHERE { ?uri a ds:Thing ; ds:kind ?kind }",
        predicates: [{ variable: "kind", match: "exact", terms: ["a"] }],
        window,
        label,
      }),
    ).toThrow(PragmaError);
    expect(() =>
      buildListQuery({
        query: "SELECT * WHERE { ?uri a ds:Thing ; ds:kind ?kind }",
        predicates: [{ variable: "kind", match: "exact", terms: ["a"] }],
        window,
        label,
      }),
    ).toThrow(/project its\s+variables by name|project its variables by name/);
  });

  it("refuses a story whose own query uses the generated variable prefix", () => {
    // Shadowing would leave the predicate comparing the caller's value against
    // the author's variable — a filter that matches nothing, silently.
    expect(() =>
      buildListQuery({
        query: "SELECT ?kind ?__pragmaFilter0 WHERE { ?u ds:kind ?kind }",
        predicates: [{ variable: "kind", match: "exact", terms: ["a"] }],
        window,
        label,
      }),
    ).toThrow(/reserved variable prefix/);
  });

  it("leaves an unfilterable SELECT * alone — it has nothing to wrap for", () => {
    const query = buildListQuery({
      query: "SELECT * WHERE { ?s ?p ?o }",
      predicates: [],
      window,
      label,
    });
    expect(query).toBe("SELECT * WHERE { ?s ?p ?o }\nLIMIT 10");
  });
});
