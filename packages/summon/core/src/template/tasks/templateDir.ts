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
 *
 * SOURCE RUNS ONLY, and this is the one template read in this package that a
 * compiled host cannot serve. It globs `options.source` off the real filesystem
 * and passes each file to `template({ source })` with no `content:`, so
 * summon-core falls through to `readFile(options.source)` — which in a
 * `bun build --compile` binary is an ENOENT under `/$bunfs`, thrown AFTER the
 * composed `mkdir` has already created the destination directory. Measured: the
 * glob itself throws first (`new Bun.Glob("**\/*").scan({ cwd })` on a path the
 * binary does not carry), so the failure is loud rather than silent.
 *
 * The generators this workspace ships do not use it; every one of them routes
 * its reads through `@canonical/summon-core/embedded` (see `loadEmbeddedSync`),
 * and a CLI that embeds a declared generator's templates asserts exactly that
 * at build time. A generator reaching for this helper instead reintroduces the
 * compiled-binary bug the registry exists to close.
 *
 * @experimental Compiled-binary hosts are not supported. Use `loadEmbeddedSync`
 *   plus per-file `template({ source, content })` if the generator must run from
 *   one.
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
