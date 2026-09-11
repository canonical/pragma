import { describe, expect, it } from "vitest";
import graphiqlHtml from "./graphiqlHtml.js";

describe("graphiqlHtml", () => {
  it("interpolates the endpoint as a JSON string literal", () => {
    expect(graphiqlHtml("/graphql")).toContain('url: "/graphql"');
  });

  it("escapes an endpoint that would otherwise break out of the literal", () => {
    expect(graphiqlHtml('/a"b')).toContain('url: "/a\\"b"');
  });

  it("escapes an endpoint that would otherwise close the script element", () => {
    // The JSON literal is well formed either way; what matters is that the
    // HTML tokenizer never sees `</script`, because that — not the JavaScript
    // grammar — is what decides where this element ends.
    const html = graphiqlHtml("/graphql</script><script>alert(1)</script>");
    expect(html).toContain(
      String.raw`url: "/graphql\u003c/script>\u003cscript>alert(1)\u003c/script>"`,
    );
    // The three pinned CDN bundles plus the inline one is four closing tags;
    // an injected pair would raise the count.
    expect(html.match(/<\/script>/g)).toHaveLength(4);
  });

  it("renders a self-contained HTML document", () => {
    const html = graphiqlHtml("/graphql");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('<div id="graphiql">');
  });
});
