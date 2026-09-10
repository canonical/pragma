/**
 * The author-query reader: the prologue it lifts, the projection it reproduces,
 * and the shapes it refuses BY NAME.
 *
 * The last of those is the point. Every refusal here used to be the same
 * sentence — "project its variables by name" — whether the reader had found
 * `SELECT *`, a comment where it wanted a variable, or a `FROM` clause. Two of
 * those three were wrong, and a wrong reason sends an author to the wrong part
 * of their own file. So each case below asserts what the message SAYS, not only
 * that it refused.
 */

import { describe, expect, it } from "vitest";
import { readAuthorQuery } from "./authorQuery.js";

/** The parts, for a query the reader can read. */
function parts(text: string) {
  const read = readAuthorQuery(text);
  if (!read.ok) throw new Error(`unreadable: ${read.reason}`);
  return read.query;
}

/** The reason, for one it cannot. */
function reason(text: string): string {
  const read = readAuthorQuery(text);
  if (read.ok) throw new Error("expected a refusal");
  return read.reason;
}

describe("the projection", () => {
  it("reads bare variables and aliased expressions, in author order", () => {
    expect(
      parts(
        [
          "SELECT ?uri ?name ?category",
          '       (GROUP_CONCAT(DISTINCT ?slug; SEPARATOR=" ") AS ?categories)',
          "WHERE { ?uri a cs:CodeStandard }",
        ].join("\n"),
      ).projection,
    ).toEqual(["uri", "name", "category", "categories"]);
  });

  it("reads through DISTINCT and through a nested projection expression", () => {
    expect(
      parts(
        "SELECT DISTINCT ?a (COALESCE(IF(?d = 0, 1, 1 - (0.2 * ?d)), 0) AS ?rank) WHERE { ?a ds:x ?d }",
      ).projection,
    ).toEqual(["a", "rank"]);
  });

  it("reads $-sigil variables, and a projection with no WHERE keyword", () => {
    expect(parts("SELECT $a $b { $a ds:x $b }").projection).toEqual(["a", "b"]);
  });

  it("answers undefined for SELECT * — the one projection it cannot enumerate", () => {
    expect(parts("SELECT * WHERE { ?s ?p ?o }").projection).toBeUndefined();
  });

  it("is not fooled by a brace or a WHERE inside a string literal", () => {
    expect(
      parts(
        'SELECT ?a (REPLACE(?a, "WHERE {", ")") AS ?b) WHERE { ?a ds:x ?y }',
      ).projection,
    ).toEqual(["a", "b"]);
  });

  it("reads through a comment sitting where a variable was expected", () => {
    // Previously undefined, which refused the story with a message saying it
    // must not use `SELECT *` — which it does not.
    expect(
      parts("SELECT # the columns\n  ?uri ?name\nWHERE { ?uri ds:name ?name }")
        .projection,
    ).toEqual(["uri", "name"]);
  });
});

describe("the prologue", () => {
  it("is empty, and the body is the whole text, when the author declares none", () => {
    const query = "SELECT ?s WHERE { ?s ?p ?o }";
    expect(parts(query)).toEqual({
      prologue: "",
      projection: ["s"],
      body: query,
    });
  });

  it("is lifted whole, and the body starts at SELECT", () => {
    const read = parts(
      [
        "PREFIX a: <https://example.test/a#>",
        "PREFIX b: <https://example.test/b#>",
        "SELECT ?s WHERE { ?s a:p ?o }",
      ].join("\n"),
    );
    expect(read.prologue).toBe(
      "PREFIX a: <https://example.test/a#>\nPREFIX b: <https://example.test/b#>",
    );
    expect(read.body).toBe("SELECT ?s WHERE { ?s a:p ?o }");
  });

  it("reads a `#` and a `>`-free IRI as an IRI, not as a comment", () => {
    // `IRIREF` excludes `>` and admits `#`, so the IRI ends at its own `>` and
    // a `#` inside it does not start a comment.
    const read = parts(
      "prefix q: <https://example.test/x#select> SELECT ?s WHERE { ?s q:p ?o }",
    );
    expect(read.prologue).toBe("prefix q: <https://example.test/x#select>");
    expect(read.projection).toEqual(["s"]);
  });

  it("tolerates lower case, a leading comment, and comments between declarations", () => {
    const read = parts(
      [
        "# select the standards",
        "base <https://example.test/>",
        "# and their categories",
        "Prefix cs: <https://example.test/cs#>",
        "select ?s where { ?s cs:p ?o }",
      ].join("\n"),
    );
    expect(read.prologue).toBe(
      [
        "base <https://example.test/>",
        "# and their categories",
        "Prefix cs: <https://example.test/cs#>",
      ].join("\n"),
    );
    expect(read.body).toBe("select ?s where { ?s cs:p ?o }");
    expect(read.projection).toEqual(["s"]);
  });

  it("is not confused by a `PREFIX` IRI containing the word select", () => {
    expect(
      parts("PREFIX p: <https://example.test/select#> SELECT ?s { ?s p:x ?o }")
        .projection,
    ).toEqual(["s"]);
  });

  it("takes the default prefix (`PREFIX : <…>`) as a declaration", () => {
    const read = parts(
      "PREFIX : <https://example.test/> SELECT ?s { ?s :x ?o }",
    );
    expect(read.prologue).toBe("PREFIX : <https://example.test/>");
  });
});

describe("what it refuses, and what it says it found", () => {
  it("names a FROM dataset clause", () => {
    expect(
      reason("SELECT ?s FROM <https://example.test/g> WHERE { ?s ?p ?o }"),
    ).toContain("FROM dataset clause");
  });

  it("names a FROM NAMED clause the same way", () => {
    expect(
      reason(
        "SELECT ?s FROM NAMED <https://example.test/g> WHERE { ?s ?p ?o }",
      ),
    ).toContain("FROM dataset clause");
  });

  it("names a text with no SELECT at all", () => {
    expect(reason("ASK { ?s ?p ?o }")).toContain("no SPARQL SELECT");
  });

  it("names a projection that binds no result variable", () => {
    expect(reason("SELECT (COUNT(?s)) WHERE { ?s ?p ?o }")).toContain(
      "names no result variable",
    );
  });

  it("names a token it does not recognise, and quotes it", () => {
    expect(reason("SELECT ?a , ?b WHERE { ?a ?p ?b }")).toContain('","');
  });

  it("names a SELECT clause that projects nothing", () => {
    expect(reason("SELECT WHERE { ?s ?p ?o }")).toContain("projects nothing");
  });
});
