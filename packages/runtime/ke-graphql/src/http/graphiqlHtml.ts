/**
 * Render the embedded GraphiQL HTML page for an endpoint (KG.12). Served on
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
    const fetcher = GraphiQL.createFetcher({ url: ${JSON.stringify(endpoint)} });
    ReactDOM.createRoot(document.getElementById("graphiql")).render(
      React.createElement(GraphiQL, { fetcher }),
    );
  </script>
</body>
</html>
`;
}
