import fs from "node:fs/promises";
import path from "node:path";
import { JSXRenderer } from "@canonical/react-ssr/renderer";
import EntryServer from "./entry-server.js";

export const htmlString = await fs.readFile(
  path.join(process.cwd(), "dist", "client", "index.html"),
  "utf-8",
);

export default function createRenderer() {
  return new JSXRenderer(EntryServer, {}, { htmlString });
}
