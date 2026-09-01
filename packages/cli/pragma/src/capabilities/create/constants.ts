/**
 * The command-path ALLOWLIST of the `create` surface — the one list the
 * surface's mechanical copies derive from: the `CreateKind` union
 * (`types.ts`) and the generator lookup (`pickGenerator.ts`). Prose is NOT
 * derived: the verb summaries in `create.verb.ts` and
 * `capabilities/hints.ts` still name the frameworks by hand.
 *
 * This table is the SINGLE authoring point for which generator packages the
 * distribution ships: it binds each `create` noun to the command PATHS it
 * runs (the generator-map keys, `component/react` … `application/react`).
 * Templates are NOT this package's concern — each generator package ships
 * its own under its `dist/esm` tree and loads them itself. The binding is
 * hand-written because it cannot be discovered:
 *  - surfacing a noun also needs prose and examples in `create.verb.ts`, so
 *    the surface is a deliberate SUBSET — `@canonical/summon-application`
 *    ships `application/react`, `domain`, `route` and `wrapper`, and `create`
 *    exposes one of them;
 *  - `pickGenerator` imports all three generators STATICALLY. A computed
 *    `import(name)` is opaque to every bundler and analyser; the historical
 *    cost was measured under `bun build --compile`, which left the
 *    generators out of the artifact entirely.
 *
 * Every declared path RUNS from a published install. `create.test.ts` pins
 * what is checkable: every declared path resolves to a generator whose
 * `meta.name` equals the path.
 *
 * Deliberately free of any import: `create.verb.ts` reads this on the
 * `--help` / `__complete` fast path (`capabilities/lazy.test.ts`).
 */
export const CREATE_GENERATORS = {
  component: {
    /** The command paths this binding runs (generator-map keys). */
    paths: ["component/react", "component/svelte", "component/lit"],
  },
  package: {
    paths: ["package"],
  },
  application: {
    paths: ["application/react"],
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
