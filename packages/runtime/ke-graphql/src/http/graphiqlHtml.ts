/**
 * Render the embedded GraphiQL HTML page for an endpoint (KG.12). Served on
 * GET without a query param when graphiql is enabled. Self-contained page;
 * the GraphiQL assets load from esm.sh at runtime in the browser (dev-tool
 * surface, not a production dependency of the API itself) — air-gapped
 * deployments supply their own template through the handler's graphiqlHtml
 * option.
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
  <link rel="stylesheet" href="https://esm.sh/graphiql@3/graphiql.min.css" />
</head>
<body>
  <div id="graphiql">Loading GraphiQL…</div>
  <script type="module">
    import React from "https://esm.sh/react@18";
    import ReactDOM from "https://esm.sh/react-dom@18/client";
    import { GraphiQL } from "https://esm.sh/graphiql@3?deps=react@18,react-dom@18";
    import { createGraphiQLFetcher } from "https://esm.sh/@graphiql/toolkit@0.9?deps=graphql@16";

    const fetcher = createGraphiQLFetcher({ url: ${JSON.stringify(endpoint)} });
    ReactDOM.createRoot(document.getElementById("graphiql")).render(
      React.createElement(GraphiQL, { fetcher }),
    );
  </script>
</body>
</html>
`;
}
