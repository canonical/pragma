import * as path from "node:path";
import { glob, sequence_, type Task, task } from "@canonical/task";
import ejsEngine from "../ejsEngine.js";
import renderString from "../renderString.js";
import template from "./template.js";
import type { TemplateDirOptions } from "./types.js";

/**
 * Simple minimatch implementation for common patterns.
 */
const minimatch = (filepath: string, pattern: string): boolean => {
  const regex = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "<<GLOBSTAR>>")
    .replace(/\*/g, "[^/]*")
    .replace(/<<GLOBSTAR>>/g, ".*");

  return new RegExp(`^${regex}$`).test(filepath);
};

/**
 * Render a directory of templates to a destination.
 */
export default function templateDir(options: TemplateDirOptions): Task<void> {
  const engine = options.engine ?? ejsEngine;

  return task(glob("**/*", options.source))
    .chain((files) => {
      const tasks = files
        .filter((file) => {
          if (options.ignore) {
            return !options.ignore.some((pattern) => minimatch(file, pattern));
          }
          return true;
        })
        .map((file) => {
          const sourcePath = path.join(options.source, file);

          let destFile = file.replace(/\.ejs$/, "");

          const renamed = options.rename?.[destFile];
          if (renamed) {
            destFile = renamed;
          }

          destFile = renderString(destFile, options.vars, engine);
          const destPath = path.join(options.dest, destFile);

          return template({
            source: sourcePath,
            dest: destPath,
            vars: options.vars,
            engine,
          });
        });

      return task(sequence_(tasks));
    })
    .unwrap();
}
