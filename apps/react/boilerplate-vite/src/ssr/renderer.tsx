import fs from "node:fs/promises";
import path from "node:path";
import { PipeableStreamRenderer } from "@canonical/react-ssr/renderer";
import EntryServer from "./entry-server.js";

export const htmlString = await fs.readFile(
  path.join(process.cwd(), "dist", "client", "index.html"),
  "utf-8",
);

const Renderer = new PipeableStreamRenderer(EntryServer, {}, {
  htmlString,
});

export default Renderer.render;
