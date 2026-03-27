import * as path from "node:path";
import { mkdir, readFile, task, type Task, writeFile } from "@canonical/task";
import ejsEngine from "../ejsEngine.js";
import renderString from "../renderString.js";
import type { TemplateOptions } from "./types.js";

/**
 * Render a single template file to a destination.
 */
export default function template(options: TemplateOptions): Task<void> {
  const engine = options.engine ?? ejsEngine;

  // Render destination path with variables
  const destPath = renderString(options.dest, options.vars, engine);
  const destDir = path.dirname(destPath);

  return task(mkdir(destDir))
    .chain(() => task(readFile(options.source)))
    .map((content) => renderString(content, options.vars, engine))
    .chain((rendered) => task(writeFile(destPath, rendered)))
    .unwrap();
}
