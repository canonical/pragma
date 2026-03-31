// Must be the very first import in the process.
// Installs HTMLElement, customElements, and other browser globals onto
// Node's globalThis. Importing any Lit component before this will throw.
import "@lit-labs/ssr/lib/install-global-dom-shim.js";

import process from "node:process";
// [multi-page] Express is used here for its routing. For a single page,
// this can be replaced with Node's built-in http module and express +
// @types/express can be removed from package.json.
import express from "express";
// [multi-page] For a single page, only import the one render function needed.
import { renderServerPage, renderHyperscalePage } from "./entry-server.js";
import { renderPage } from "./renderer.js";

const PORT = process.env.PORT || 5173;

const app = express();

app.use("/assets", express.static("dist/client/assets"));

app.get("/", (_req, res) => {
  res.redirect("/server");
});

// [multi-page] For a single page, replace the route handlers below with a
// single catch-all: app.use((_req, res, next) => { ... })
app.get("/server", (_req, res, next) => {
  renderServerPage()
    .then(renderPage)
    .then((html) => res.status(200).setHeader("Content-Type", "text/html").end(html))
    .catch(next);
});

app.get("/server/hyperscale", (_req, res, next) => {
  renderHyperscalePage()
    .then(renderPage)
    .then((html) => res.status(200).setHeader("Content-Type", "text/html").end(html))
    .catch(next);
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}/`);
});

export default app;