import * as process from "node:process";
import express from "express";
import { getAuthRedirectHref, normalizeRequestHref } from "../routes.js";
import prepareRender from "./renderer.js";

const PORT = process.env.PORT || 5173;

const app = express();

app.use(/^\/assets/, express.static("dist/client/assets"));

app.use(async (req, res, next) => {
  try {
    const requestHref = normalizeRequestHref(req.originalUrl || req.url || "/");
    const redirectHref = getAuthRedirectHref(requestHref);

    if (redirectHref) {
      res.redirect(302, redirectHref);
      return;
    }

    const { renderer } = await prepareRender(requestHref);

    const result = renderer.renderToPipeableStream();

    await renderer.statusReady;
    res.writeHead(renderer.statusCode, {
      "Content-Type": "text/html; charset=utf-8",
    });
    result.pipe(res);
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}/`);
});

export default app;
