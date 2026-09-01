/**
 * Embed a string as a JavaScript string literal that is safe to place inside
 * an inline `<script>` element.
 *
 * `JSON.stringify` alone is NOT enough, because two different parsers read
 * this text. JSON escaping satisfies the JavaScript grammar, but the HTML
 * tokenizer is what decides where a `<script>` element ends, and it decides
 * by scanning the raw element text for `</script` — a sequence JSON escaping
 * leaves completely intact. An endpoint of `</script><script>…</script>`
 * therefore closes this element and opens an attacker-controlled one, even
 * though the value is a perfectly well-formed JSON string. (`<!--` is the
 * same class of hazard: it opens the script-data-escaped state and moves
 * where the tokenizer believes the element ends.)
 *
 * Escaping every `<` as `\u003c` removes both sequences at their source, which
 * is why it is done that way rather than by matching `</script` alone — the
 * tokenizer has more than one exit and a denylist has to know them all.
 * `\u003c` is a JavaScript string escape, so the value the page actually
 * receives is unchanged; only its spelling in the document differs.
 *
 * The endpoint reaches this template from handler configuration rather than
 * from a request, so this is defence in depth. It earns its place anyway:
 * configuration is routinely assembled from environment or deployment
 * values, and a template that is only correct for trusted input is one
 * deployment away from not being correct.
 */
const asInlineScriptString = (value: string): string =>
  JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * Render the embedded GraphiQL HTML page for an endpoint. Served on
 * GET without a query param when graphiql is enabled. Self-contained page;
 * the GraphiQL assets load as version-pinned UMD bundles from unpkg at
 * runtime in the browser (dev-tool surface, not a production dependency of
 * the API itself) — air-gapped deployments supply their own template through
 * the handler's graphiqlHtml option.
 *
 * Pinned to graphiql 3.x deliberately: the single UMD bundle ships its own
 * CodeMirror and fetcher toolkit, so the page cannot end up with two
 * CodeMirror instances — the crash mode of CDN ESM-graph assembly
 * (esm.sh `?deps=` rewriting) — and 3.x is the last line that publishes a
 * UMD build at all (4+ is Monaco-based and ESM-only). React 18 is pinned
 * for the same reason: 19 dropped UMD builds.
 */
export default function graphiqlHtml(endpoint: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>GraphiQL — ke-graphql</title>
  <style>
    html, body, #graphiql { height: 100%; margin: 0; }
  </style>
  <link rel="stylesheet" href="https://unpkg.com/graphiql@3.9.0/graphiql.min.css" />
</head>
<body>
  <div id="graphiql">Loading GraphiQL…</div>
  <script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/graphiql@3.9.0/graphiql.min.js"></script>
  <script>
    const fetcher = GraphiQL.createFetcher({ url: ${asInlineScriptString(endpoint)} });
    ReactDOM.createRoot(document.getElementById("graphiql")).render(
      React.createElement(GraphiQL, { fetcher }),
    );
  </script>
</body>
</html>
`;
}
