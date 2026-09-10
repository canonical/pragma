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

describe("buildListQuery — nothing to filter", () => {
  const paged = buildListQuery({
    query: AUTHORED,
    predicates: [],
    window: { limit: 10, offset: 20 },
    label,
  });

  it("still wraps, because appending a page to author text cannot be safe", () => {
    // A story whose own text ends in `LIMIT`, `OFFSET` or a trailing `VALUES`
    // is a syntax error the moment a page is appended to it — and the page has
    // a default, so that error fires on every call rather than on paged ones.
    // The wrap is the only shape that holds for all of them.
    expect(paged).toContain(`  {\n${AUTHORED}\n  }`);
    expect(paged.startsWith("SELECT ?uri ?name ?category ?categories\n")).toBe(
      true,
    );
    expect(paged.trimEnd().endsWith("LIMIT 10 OFFSET 20")).toBe(true);
  });

  it("carries no predicate at all — an unfiltered page filters nothing", () => {
    expect(paged).not.toContain("FILTER");
    expect(paged).not.toContain("VALUES");
  });

  it("omits OFFSET 0, which is the no-op it looks like", () => {
    const first = buildListQuery({
      query: AUTHORED,
      predicates: [],
      window,
      label,
    });
    expect(first.trimEnd().endsWith("LIMIT 10")).toBe(true);
    expect(first).not.toContain("OFFSET");
  });

  it("pages an author query that already ends in its own LIMIT", () => {
    // The shape the appended modifier broke: `LIMIT 5 LIMIT 10` is not a query.
    // Inside a sub-select the author's own cap is legal, and the page's cap
    // applies to what that cap returned.
    const authored = "SELECT ?s WHERE { ?s ?p ?o } ORDER BY ?s LIMIT 5";
    const query = buildListQuery({
      query: authored,
      predicates: [],
      window,
      label,
    });
    expect(query).toContain(`  {\n${authored}\n  }`);
    expect(query.trimEnd().endsWith("LIMIT 10")).toBe(true);
  });

  it("pages an author query that already ends in a trailing VALUES block", () => {
    const authored = 'SELECT ?s WHERE { ?s ?p ?o } VALUES ?s { "a" }';
    const query = buildListQuery({
      query: authored,
      predicates: [],
      window,
      label,
    });
    expect(query).toContain(`  {\n${authored}\n  }`);
  });

  it("keeps an author's SELECT * as SELECT *, which is its own key order", () => {
    // `SELECT *` in the wrapper over an author `SELECT *` is the same
    // alphabetisation twice, so the rows a caller gets keep their shape.
    const query = buildListQuery({
      query: "SELECT * WHERE { ?s ?p ?o }",
      predicates: [],
      window,
      label,
    });
    expect(query).toBe(
      [
        "SELECT *",
        "WHERE {",
        "  {",
        "SELECT * WHERE { ?s ?p ?o }",
        "  }",
        "}",
        "LIMIT 10",
      ].join("\n"),
    );
  });
});

describe("buildListQuery — the author's own prologue", () => {
  const AUTHORED_WITH_PROLOGUE = [
    "PREFIX ex: <https://example.test/x#>",
    "PREFIX ds: <https://example.test/ds#>",
    "SELECT ?uri ?kind WHERE { ?uri ex:kind ?kind }",
  ].join("\n");

  it("lifts PREFIX lines to the wrapper's prologue, not into the pattern", () => {
    // Spliced inside the group graph pattern — where only patterns may appear —
    // a `PREFIX` line is a parse error, and a story shaped this way died the
    // moment somebody passed a filter.
    const query = buildListQuery({
      query: AUTHORED_WITH_PROLOGUE,
      predicates: [{ variable: "kind", match: "exact", terms: ["a"] }],
      window,
      label,
    });
    expect(query.startsWith("PREFIX ex: <https://example.test/x#>\n")).toBe(
      true,
    );
    // The body is a SUFFIX of the author's text, byte for byte: a split, not
    // an edit.
    expect(query).toContain(
      "  {\nSELECT ?uri ?kind WHERE { ?uri ex:kind ?kind }\n  }",
    );
    // And the prologue is above the wrapper's own SELECT, exactly once.
    expect(query.indexOf("PREFIX ds:")).toBeLessThan(
      query.indexOf("SELECT ?uri ?kind\nWHERE {"),
    );
    expect(query.match(/PREFIX ds:/g)).toHaveLength(1);
  });

  it("lifts it for an unfiltered page too", () => {
    const query = buildListQuery({
      query: AUTHORED_WITH_PROLOGUE,
      predicates: [],
      window,
      label,
    });
    expect(query.startsWith("PREFIX ex:")).toBe(true);
    expect(query).not.toContain("  {\nPREFIX");
  });

  it("emits nothing extra for a story that declares no prologue", () => {
    const query = buildListQuery({
      query: AUTHORED,
      predicates: [],
      window,
      label,
    });
    expect(query.startsWith("SELECT ?uri ?name ?category ?categories\n")).toBe(
      true,
    );
    expect(query).not.toContain("PREFIX");
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
  const build = (query: string, filtered = true) =>
    buildListQuery({
      query,
      predicates: filtered
        ? [{ variable: "kind", match: "exact", terms: ["a"] }]
        : [],
      window,
      label,
    });

  it("refuses a filterable story whose SELECT projects *", () => {
    expect(() =>
      build("SELECT * WHERE { ?uri a ds:Thing ; ds:kind ?kind }"),
    ).toThrow(PragmaError);
    expect(() =>
      build("SELECT * WHERE { ?uri a ds:Thing ; ds:kind ?kind }"),
    ).toThrow(/project its variables by name/);
  });

  it("refuses a story whose own query uses the generated variable prefix", () => {
    // Shadowing would leave the predicate comparing the caller's value against
    // the author's variable — a filter that matches nothing, silently.
    expect(() =>
      build("SELECT ?kind ?__pragmaFilter0 WHERE { ?u ds:kind ?kind }"),
    ).toThrow(/reserved variable prefix/);
  });

  it("refuses a dataset clause, and says it found one", () => {
    // Not the `SELECT *` message it used to get: the author DOES project by
    // name, and a wrong reason sends them to the wrong line of their own file.
    // A sub-select has no place for `FROM`, and lifting it would mean cutting a
    // span out of the middle of the author's text.
    for (const filtered of [true, false]) {
      expect(() =>
        build(
          "SELECT ?kind FROM <https://example.test/g> WHERE { ?u ds:kind ?kind }",
          filtered,
        ),
      ).toThrow(/cannot be paged.*FROM dataset clause/s);
    }
  });

  it("refuses a text that is not a SELECT, and says that", () => {
    expect(() => build("ASK { ?s ?p ?o }", false)).toThrow(
      /cannot be paged.*no SPARQL SELECT/s,
    );
  });
});
