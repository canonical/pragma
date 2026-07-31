// =============================================================================
// The default GraphiQL page: endpoint embedding and the bootstrapping markers
// the page cannot render without. It is a runtime export (the handler serves
// it on a GET without a query, and consumers override it for air-gapped
// deployments), so its contract is tested like any other.
// =============================================================================

import { describe, expect, it } from "vitest";
import graphiqlHtml from "./graphiqlHtml.js";

describe("graphiqlHtml", () => {
  it("embeds the endpoint argument in the fetcher configuration", () => {
    const html = graphiqlHtml("/graphql");
    expect(html).toContain('createFetcher({ url: "/graphql" })');
  });

  it("embeds the endpoint as a JSON string, not by raw concatenation", () => {
    // The endpoint reaches this template from handler configuration. Splicing
    // it in raw would let a quote close the string literal and turn the rest
    // of the value into page script; JSON.stringify escapes it instead.
    const html = graphiqlHtml('/graph"ql');
    expect(html).toContain(String.raw`createFetcher({ url: "/graph\"ql" })`);
    expect(html).not.toContain('url: "/graph"ql"');
  });

  it("ships the bootstrapping markers the page needs to render", () => {
    const html = graphiqlHtml("/graphql");
    // A complete standalone document …
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<title>GraphiQL — ke-graphql</title>");
    // … the mount point the render call targets …
    expect(html).toContain('<div id="graphiql">');
    expect(html).toContain('document.getElementById("graphiql")');
    // … the UMD bundles (pinned: graphiql 3.x is the last UMD line, and
    // React 18 the last React with a UMD build) plus the stylesheet …
    expect(html).toContain("graphiql@3.9.0/graphiql.min.js");
    expect(html).toContain("graphiql@3.9.0/graphiql.min.css");
    expect(html).toContain("react@18.3.1/umd/react.production.min.js");
    expect(html).toContain("react-dom@18.3.1/umd/react-dom.production.min.js");
    // … and the render call itself.
    expect(html).toContain("React.createElement(GraphiQL, { fetcher })");
  });
});
