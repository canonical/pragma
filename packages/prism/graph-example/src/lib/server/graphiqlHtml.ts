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
/**
 * Embed a string as a JavaScript literal that is safe INSIDE an inline
 * `<script>` element.
 *
 * `JSON.stringify` alone is not enough, because two parsers read this text.
 * JSON escaping satisfies the JavaScript grammar, but the HTML tokenizer is
 * what decides where the `<script>` element ends, and it decides by scanning
 * the raw element text for `</script` — a sequence JSON escaping leaves
 * completely intact. An endpoint of `</script><script>…` closes this element
 * and opens an attacker-controlled one while remaining a well-formed JSON
 * string. (`<!--` is the same class of hazard: it moves the tokenizer into the
 * script-data-escaped state and with it where the element is believed to end.)
 *
 * Escaping every `<` as `\u003c` removes both sequences at their source,
 * rather than matching `</script` alone — the tokenizer has more than one
 * exit and a denylist has to know them all. `\u003c` is a JavaScript string
 * escape, so the value the page receives is unchanged; only its spelling in
 * the document differs. The sibling template in `@canonical/ke-graphql` escapes the same way and says
 * the same thing; the two are kept in step deliberately.
 */
const asInlineScriptString = (value: string): string =>
  JSON.stringify(value).replace(/</g, "\\u003c");

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
    const fetcher = GraphiQL.createFetcher({ url: ${asInlineScriptString(endpoint)} });
    ReactDOM.createRoot(document.getElementById("graphiql")).render(
      React.createElement(GraphiQL, { fetcher }),
    );
  </script>
</body>
</html>
`;
}
