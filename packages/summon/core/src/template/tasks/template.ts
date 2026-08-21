import * as path from "node:path";
import {
  fail,
  mkdir,
  pure,
  readFile,
  type Task,
  task,
  writeFile,
} from "@canonical/task";
import ejsEngine from "../ejsEngine.js";
import { hasEmbeddedTemplates } from "../embedded/store.js";
import renderString from "../renderString.js";
import type { TemplateOptions } from "./types.js";

/** Task-error code for a content-less template read in embedded context. */
export const TEMPLATE_DISK_READ_IN_EMBEDDED_CONTEXT =
  "TEMPLATE_DISK_READ_IN_EMBEDDED_CONTEXT";

/**
 * Render a single template file to a destination.
 *
 * When `options.content` is provided, uses it directly instead of
 * reading from `options.source`. This supports compiled binaries
 * where template files are embedded and pre-loaded.
 *
 * The silent `readFile(options.source)` fallback survives ONLY outside
 * embedded context: once a host has injected an embedded manifest
 * ({@link hasEmbeddedTemplates}), a content-less call FAILS with a named
 * error instead of falling through to a disk read that would die with a raw
 * `ENOENT … /$bunfs/…` mid-generation, after directories were already made.
 * Source runs (empty manifest — the summon bin, tests) are byte-identical to
 * before.
 */
export default function template(options: TemplateOptions): Task<void> {
  const engine = options.engine ?? ejsEngine;

  // Render destination path with variables
  const destPath = renderString(options.dest, options.vars, engine);
  const destDir = path.dirname(destPath);

  // Key off `undefined`, not truthiness: a legitimately empty embedded
  // template ("") must still use the provided content rather than falling
  // back to reading from disk (which fails in compiled-binary mode).
  const readSource: Task<string> =
    options.content !== undefined
      ? task(pure(options.content)).unwrap()
      : hasEmbeddedTemplates()
        ? fail<string>({
            code: TEMPLATE_DISK_READ_IN_EMBEDDED_CONTEXT,
            message:
              `Template for "${destPath}" would read ${options.source} from disk ` +
              "in embedded context — the generator must pass content (loadTemplateSync).",
          })
        : task(readFile(options.source)).unwrap();

  return task(mkdir(destDir))
    .chain(() => task(readSource))
    .map((content) => renderString(content, options.vars, engine))
    .chain((rendered) => task(writeFile(destPath, rendered)))
    .unwrap();
}
