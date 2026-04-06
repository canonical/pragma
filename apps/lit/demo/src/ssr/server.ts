// Must be the very first import in the process.
// Installs HTMLElement, customElements, and other browser globals onto
// Node's globalThis. Importing any Lit component before this will throw.
import "@lit-labs/ssr/lib/install-global-dom-shim.js";

import process from "node:process";
import express from "express";
import { isKnownRoute } from "routes.js";
import { renderRoute } from "./entry-server.js";
import { renderPage } from "./renderer.js";

const PORT = process.env.PORT || 5173;

const app = express();

app.use("/assets", express.static("dist/client/assets"));

app.get("/", (_req, res) => {
  res.redirect("/server");
});

app.get(/^\/server(?:\/.*)?$/, (req, res, next) => {
  if (!isKnownRoute(req.path)) {
    res.status(404).setHeader("Content-Type", "text/html").end("Not Found");
    return;
  }

  renderRoute(req.path)
    .then(renderPage)
    .then((html) =>
      res.status(200).setHeader("Content-Type", "text/html").end(html),
    )
    .catch(next);
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}/`);
});

export default app;
