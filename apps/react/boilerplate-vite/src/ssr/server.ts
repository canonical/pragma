import * as process from "node:process";
import express from "express";
import { renderToPipeableStream } from "react-dom/server";
import { getAuthRedirectHref } from "../routes.js";
import { prepareSSR } from "./entry-server.js";

const PORT = process.env.PORT || 5173;

const app = express();

app.use(/^\/(assets|public)/, express.static("dist/client/assets"));

app.use(async (req, res, next) => {
  try {
    const requestUrl = req.originalUrl || req.url || "/";

    const authRedirect = getAuthRedirectHref(requestUrl);

    if (authRedirect) {
      res.redirect(302, authRedirect);

      return;
    }

    const { router, headCollector, tree } = prepareSSR(requestUrl);

    if (!router.match) {
      res.status(404);
    }

    const { pipe } = renderToPipeableStream(tree, {
      onShellReady() {
        const headHtml = headCollector.toHtml();

        res.setHeader("content-type", "text/html; charset=utf-8");
        res.write(
          `<!doctype html><html><head>${headHtml}<link rel="stylesheet" href="/assets/index.css" /></head><body><div id="root">`,
        );
        pipe(res);
      },
      onAllReady() {
        res.write("</div></body></html>");
        res.end();
      },
      onShellError(error) {
        res.status(500).send("Server error");
        console.error(error);
      },
    });
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}/`);
});

export default app;
