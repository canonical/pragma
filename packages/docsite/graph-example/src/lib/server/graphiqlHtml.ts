/**
 * Render the embedded GraphiQL page for an endpoint. Served on GET when
 * GraphiQL is enabled, which is dev-only by default.
 *
 * The assets load as version-pinned UMD bundles from unpkg at runtime — a
 * dev-tool surface, not a production dependency of the API. Pinned to
 * graphiql 3.x because that line ships a single UMD bundle carrying its own
 * CodeMirror, so the page cannot end up with two CodeMirror instances; 4+ is
 * Monaco-based and ESM-only. React 18 for the same reason: 19 dropped UMD.
 */
export default function graphiqlHtml(endpoint: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>GraphiQL — prism-graph-example</title>
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
