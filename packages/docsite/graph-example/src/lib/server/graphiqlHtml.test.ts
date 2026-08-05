import { describe, expect, it } from "vitest";
import graphiqlHtml from "./graphiqlHtml.js";

describe("graphiqlHtml", () => {
  it("interpolates the endpoint as a JSON string literal", () => {
    expect(graphiqlHtml("/graphql")).toContain('url: "/graphql"');
  });

  it("escapes an endpoint that would otherwise break out of the literal", () => {
    expect(graphiqlHtml('/a"b')).toContain('url: "/a\\"b"');
  });

  it("renders a self-contained HTML document", () => {
    const html = graphiqlHtml("/graphql");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('<div id="graphiql">');
  });
});
