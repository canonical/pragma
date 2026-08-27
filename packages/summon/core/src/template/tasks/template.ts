import * as path from "node:path";
import {
  mkdir,
  pure,
  readFile,
  type Task,
  task,
  writeFile,
} from "@canonical/task";
import ejsEngine from "../ejsEngine.js";
import renderString from "../renderString.js";
import type { TemplateOptions } from "./types.js";

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
      : task(readFile(options.source)).unwrap();

  return task(mkdir(destDir))
    .chain(() => task(readSource))
    .map((content) => renderString(content, options.vars, engine))
    .map((rendered) => options.transform?.(rendered) ?? rendered)
    .chain((rendered) => task(writeFile(destPath, rendered)))
    .unwrap();
}
