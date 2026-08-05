/**
 * The generator bindings the `create` surface exposes — the one list the
 * surface's mechanical copies derive from: the `CreateKind` union (`types.ts`),
 * the `--framework` enum (`create.verb.ts`), the generator lookup
 * (`pickGenerator.ts`), and the template roots the bundler embeds
 * (`scripts/build.ts`). Prose is NOT derived: the verb summaries below
 * `createVerbs` and `capabilities/hints.ts` still name the frameworks by hand.
 *
 * This table is the SINGLE authoring point for which generator packages the
 * distribution ships: it binds each `create` noun to the generator-map key it
 * runs and to the package `scripts/build.ts` harvests its files from. The
 * binding is hand-written because surfacing a noun also needs a hand-written
 * prompt mirror, path param and examples in `create.verb.ts`, so the surface is
 * a deliberate SUBSET of what the declared packages ship —
 * `@canonical/summon-application` ships `application/react`, `domain`, `route`
 * and `wrapper`, and `create` exposes one of them.
 *
 * `create.test.ts` pins what is checkable: every binding resolves to the
 * generator it names, and every embedded manifest key falls under a declared
 * package's scope.
 *
 * Deliberately free of any import: `create.verb.ts` reads this on the `--help` /
 * `__complete` fast path.
 */
export const CREATE_GENERATORS = {
  component: {
    /** The declaring package: the manifest scope its files embed under. */
    name: "@canonical/summon-component",
    /** `--framework <f>` runs `component/<f>`; the FIRST is the enum default. */
    frameworks: ["react", "svelte", "lit"],
  },
  package: {
    /** The declaring package: the manifest scope its files embed under. */
    name: "@canonical/summon-package",
    /** The generator-map key `create package` runs. */
    key: "package",
  },
  application: {
    /** The declaring package: the manifest scope its files embed under. */
    name: "@canonical/summon-application",
    /** The generator-map key `create application` runs. */
    key: "application/react",
  },
} as const;
