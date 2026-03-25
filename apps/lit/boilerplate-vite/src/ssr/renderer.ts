import fs from "node:fs/promises";
import path from "node:path";
import { renderApp } from "./entry-server.js";

let template: string;

async function getTemplate(): Promise<string> {
  if (!template) {
    template = await fs.readFile(
      path.join(process.cwd(), "dist", "client", "index.html"),
      "utf-8",
    );
  }
  return template;
}

export async function render(): Promise<string> {
  const tmpl = await getTemplate();
  const appHtml = renderApp();
  return tmpl.replace(
    /(<div id="root">)[\s\S]*?(<\/div>)/,
    `$1${appHtml}$2`,
  );
}
