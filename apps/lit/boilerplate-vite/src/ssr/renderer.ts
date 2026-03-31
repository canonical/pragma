import fs from "node:fs/promises";
import path from "node:path";

let template: string;
let resolvedTemplatePath: string | undefined;

async function resolveTemplatePath(): Promise<string> {
  if (resolvedTemplatePath) {
    return resolvedTemplatePath;
  }

  const prodTemplatePath = path.join(process.cwd(), "dist", "client", "index.html");
  try {
    await fs.access(prodTemplatePath);
    resolvedTemplatePath = prodTemplatePath;
    return resolvedTemplatePath;
  } catch {
    resolvedTemplatePath = path.join(process.cwd(), "index.html");
    return resolvedTemplatePath;
  }
}

async function getTemplate(): Promise<string> {
  const templatePath = await resolveTemplatePath();
  const isProdTemplate = templatePath.includes(path.join("dist", "client", "index.html"));

  if (isProdTemplate) {
    // Cache the built template in production/server mode.
    template ??= await fs.readFile(templatePath, "utf-8");
    return template;
  }

  // Always read from disk in development so changes are picked up immediately.
  return fs.readFile(templatePath, "utf-8");
}

/**
 * Injects SSR-rendered HTML into the HTML template at the <!--ssr-outlet-->
 * comment placeholder. Using a comment placeholder instead of a regex avoids
 * fragility when the root element contains nested markup.
 */
export async function renderPage(appHtml: string): Promise<string> {
  const tmpl = await getTemplate();
  return tmpl.replace("<!--ssr-outlet-->", appHtml);
}
