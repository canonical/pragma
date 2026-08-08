/**
 * The build's domain constants: where generated modules land and what they are
 * called.
 *
 * ONE HOME, because the three basenames are ONE SET — the contract between the
 * codegen that writes them, the fork alias plugin that substitutes them, and the
 * relative imports in `src/capabilities/create/` that read them. Two of them
 * used to live in `scripts/generateCreateSurface.ts` (a module that also exports
 * functions, which `cs:code.constants.file` names as a `cs:dont`) and the third
 * in `scripts/build.ts`, which then reassembled all three into the alias set.
 * Adding or renaming a generated module meant finding two homes and remembering
 * the third assembly — and a basename missing from that set is exactly the
 * HALF-aliased module graph `aliasGeneratedModules`' own docblock records as a
 * bug that built, type-checked and ran while serving one importer the wrong
 * surface.
 */

import { fileURLToPath } from "node:url";

/**
 * Where the shipped distribution's generated modules land — the DEFAULT, not a
 * fixed location. A fork build passes its own directory, which is what makes the
 * declaration a parameter of the build rather than an import of it.
 */
export const DEFAULT_GENERATED_DIR = fileURLToPath(
  new URL("../src/capabilities/create/", import.meta.url),
);

/** The value module's basename: the literal import specifiers `--compile` needs. */
export const GENERATORS_MODULE = "generators.generated.ts";

/** The data module's basename: the zero-import derived `create` surface. */
export const SURFACE_MODULE = "surface.generated.ts";

/** The manifest module's basename: every declared template inlined as a string. */
export const MANIFEST_MODULE = "templates.embedded.generated.ts";

/**
 * Every generated create module, by basename — the set a fork build aliases.
 * A module generated but absent from this set is linked from the SHIPPED
 * distribution into a fork's binary.
 */
export const GENERATED_MODULES: ReadonlySet<string> = new Set([
  GENERATORS_MODULE,
  SURFACE_MODULE,
  MANIFEST_MODULE,
]);
