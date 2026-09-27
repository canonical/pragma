import * as path from "node:path";
import { loadTemplateSync, renderString } from "@canonical/summon-core";

/**
 * Render one of a generator's `.ejs` templates with its variables.
 *
 * The template is read when this is called — on `generate()`, never at module
 * evaluation — from the generator's own `templates/` directory, which the build
 * copies next to the compiled generator. The rendered text is what the
 * generator writes with `writeFile`, so each written file keeps `writeFile`'s
 * own undo (deleting that file) and nothing else.
 *
 * @param templatesDir - The generator's `templates/` directory.
 * @param file - The template's file name within it.
 * @param vars - The template's variables.
 * @returns The rendered text.
 * @note Impure — reads the template from disk.
 */
export function renderTemplate(
  templatesDir: string,
  file: string,
  vars: Record<string, unknown>,
): string {
  return renderString(
    loadTemplateSync(path.join(templatesDir, file)).content,
    vars,
  );
}
