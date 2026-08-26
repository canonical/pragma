/**
 * The generator bindings the `create` surface exposes — the one list the
 * surface's mechanical copies derive from: the `CreateKind` union (`types.ts`),
 * the generator lookup (`pickGenerator.ts`), and the template roots the
 * manifest carries (`scripts/build.ts`). Prose is NOT derived: the verb
 * summaries in `create.verb.ts` and `capabilities/hints.ts` still name the
 * frameworks by hand.
 *
 * This table is the SINGLE authoring point for which generator packages the
 * distribution ships: it binds each `create` noun to the command PATHS it
 * runs (the generator-map keys, `component/react` … `application/react`) and
 * to the template roots `scripts/build.ts` harvests for the embedded manifest.
 * The binding is hand-written because neither half can be discovered:
 *  - surfacing a noun also needs prose and examples in `create.verb.ts`, so
 *    the surface is a deliberate SUBSET — `@canonical/summon-application`
 *    ships `application/react`, `domain`, `route` and `wrapper`, and `create`
 *    exposes one of them;
 *  - `pickGenerator` imports all three generators STATICALLY. A computed
 *    `import(name)` is opaque to every bundler and analyser; the historical
 *    cost was measured under `bun build --compile`, which left the
 *    generators out of the artifact entirely.
 *
 * Every declared root is EMBEDDED and every declared path RUNS from the
 * compiled binary — the generators all route reads through summon-core's
 * embedded seam, so the old per-binding `readsEmbeddedTemplates` bit is
 * universally true and gone. `create.test.ts` pins what is checkable: every
 * declared path resolves to a generator whose `meta.name` equals the path,
 * and the embedded manifest carries exactly the declared roots' trees.
 *
 * Deliberately free of any import: `create.verb.ts` reads this on the
 * `--help` / `__complete` fast path (`capabilities/lazy.test.ts`).
 */
export const CREATE_GENERATORS = {
  component: {
    /** The declaring package (the workspace dir the build harvests from). */
    name: "@canonical/summon-component",
    /** The command paths this binding runs (generator-map keys). */
    paths: ["component/react", "component/svelte", "component/lit"],
    /**
     * The template roots the embedded manifest carries, keyed by command-path
     * prefix.
     *
     * ONLY `component` declares any. The manifest is a fallback:
     * `loadTemplateSync` reads the real file from the resolved generator
     * package first and reaches the manifest only when that read throws. The
     * other two generators call `template({ source })`, which never consults
     * it, so embedding their templates would be bytes nothing can look up.
     */
    templateRoots: [{ prefix: "component", relDir: "src/templates" }],
  },
  package: {
    name: "@canonical/summon-package",
    paths: ["package"],
    /** None: this generator reads templates by path. See `component` above. */
    templateRoots: [],
  },
  application: {
    name: "@canonical/summon-application",
    paths: ["application/react"],
    /**
     * None: reads by path like `package`, and also `copy()`s non-`.ejs` assets,
     * which no manifest of `.ejs` strings could carry.
     */
    templateRoots: [],
  },
} as const;

/**
 * The component frameworks, DERIVED from the declared tree segments — the
 * second path segment of each `component/<framework>` binding.
 */
export const COMPONENT_FRAMEWORKS: readonly string[] =
  CREATE_GENERATORS.component.paths.map(
    (commandPath) => commandPath.split("/")[1] as string,
  );
