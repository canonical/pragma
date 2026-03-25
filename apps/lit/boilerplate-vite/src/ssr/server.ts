// Must be first — installs HTMLElement, customElements, etc. on globalThis
// so that Lit component class definitions can run in Node.
import "@lit-labs/ssr/lib/install-global-dom-shim.js";

import * as process from "node:process";
import express from "express";
import { render } from "./renderer.js";

const PORT = process.env.PORT || 5173;

const app = express();

app.use("/assets", express.static("dist/client/assets"));

app.use((_req, res, next) => {
  render()
    .then((html) => {
      res.status(200).setHeader("Content-Type", "text/html").end(html);
    })
    .catch(next);
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}/`);
});

export default app;
