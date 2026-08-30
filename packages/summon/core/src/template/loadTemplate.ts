/**
 * Template loading: read a generator's template file from its own package.
 *
 * A generator's templates ship beside it — `copy-templates.ts` puts each
 * package's `templates/` tree into its `dist/esm`, and the generator resolves
 * them `__dirname`-relative. So a load is a file read, and a miss is a hard
 * error naming the path: callers do not guard against empty content, and a
 * silent `""` would write blank files.
 *
 * Deliberately SYNCHRONOUS, so a generator can load its templates lazily inside
 * its synchronous `generate(answers)` call rather than at module eval. That is
 * what keeps READ commands template-free: `--help` and completion never touch a
 * template because they never reach a `generate`.
 */

import { readFileSync } from "node:fs";

/** A template's source path and its contents. */
export interface LoadedTemplate {
  /** Absolute path the template was read from. */
  readonly source: string;
  /** The template's contents. */
  readonly content: string;
}

/**
 * Read a template from disk.
 *
 * @param source - Absolute path to the template file.
 * @returns The loaded template.
 * @throws If the file cannot be read, naming the path.
 * @note Impure — reads the filesystem.
 */
export function loadTemplateSync(source: string): LoadedTemplate {
  try {
    return { source, content: readFileSync(source, "utf-8") };
  } catch (cause) {
    throw new Error(`Template not found: ${source}`, { cause });
  }
}

/**
 * Async wrapper over {@link loadTemplateSync}, for callers that await a load.
 * The body is fully synchronous.
 *
 * @param source - Absolute path to the template file.
 * @returns The loaded template.
 * @note Impure — reads the filesystem.
 */
export async function loadTemplate(source: string): Promise<LoadedTemplate> {
  return loadTemplateSync(source);
}
