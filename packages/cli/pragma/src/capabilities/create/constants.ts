/**
 * The generator bindings the `create` surface exposes — the one list the
 * surface's mechanical copies derive from: the `CreateKind` union (`types.ts`),
 * the `--framework` enum and the compiled-binary gate (`create.verb.ts`), the
 * generator lookup (`pickGenerator.ts`), and the template roots the bundler
 * embeds (`scripts/build.ts`). Prose is NOT derived: the verb summaries below
 * `createVerbs` and `capabilities/hints.ts` still name the frameworks by hand.
 *
 * This table is the SINGLE authoring point for which generator packages the
 * distribution ships: it binds each `create` noun to the generator-map key it
 * runs, and — for the one generator whose templates the binary carries — to
 * the package `scripts/build.ts` harvests them from. (A parallel `generators`
 * CONFIG field once declared the same packages; it was validated, layered and
 * read by nothing, and was removed under the L-OPEN-1 ruling — the config
 * validator now rejects it loudly.) The binding is hand-written because
 * neither half can be discovered:
 *  - surfacing a noun also needs a hand-written prompt mirror, path param and
 *    examples in `create.verb.ts`, so the surface is a deliberate SUBSET —
 *    `@canonical/summon-application` ships `application/react`, `domain`, `route`
 *    and `wrapper`, and `create` exposes one of them;
 *  - `bun build --compile` bundles only statically analysable import specifiers,
 *    so a shipped binary can never `import(name)` a declared package (measured:
 *    `Cannot find module '@canonical/summon-component' from '/$bunfs/root/…'`).
 *    `pickGenerator` must import all three statically.
 *
 * `create.test.ts` pins what is checkable: every binding resolves to the
 * generator it names, and the embedded manifest carries only the templates of
 * the binding that reads through it.
 *
 * Deliberately free of any import: `create.verb.ts` reads this on the `--help` /
 * `__complete` fast path (`capabilities/lazy.test.ts`).
 */
export const CREATE_GENERATORS = {
  component: {
    /**
     * The declaring package: `scripts/build.ts` harvests its `.ejs` for the
     * binary.
     */
    name: "@canonical/summon-component",
    /** `--framework <f>` runs `component/<f>`; the FIRST is the enum default. */
    frameworks: ["react", "svelte", "lit"],
    /**
     * Runs from the compiled binary: this generator routes every template read
     * through `loadTemplateSync` and passes `content:` into `template()`, so the
     * embedded manifest serves it. That — not the templates' file extensions —
     * is the property that decides it, and it is a fact about the GENERATOR's
     * source, not about what this build chooses to embed.
     */
    readsEmbeddedTemplates: true,
  },
  package: {
    /** The declaring package: the manifest scope its files embed under. */
    name: "@canonical/summon-package",
    /** The generator-map key `create package` runs. */
    key: "package",
    /**
     * Runs from the compiled binary: every one of its 11 `template({ source })`
     * calls now passes the `content:` its `loadTemplateSync` returns, so
     * summon-core never falls through to `readFile(options.source)` — the read
     * that used to die with `ENOENT … '/$bunfs/templates/package.json.ejs'`
     * after `mkdir` had already left `my-lib/` and `my-lib/src/` on disk.
     */
    readsEmbeddedTemplates: true,
  },
  application: {
    /** The declaring package: the manifest scope its files embed under. */
    name: "@canonical/summon-application",
    /** The generator-map key `create application` runs. */
    key: "application/react",
    /**
     * NOT runnable from the compiled binary — same cause as `package` (measured:
     * `ENOENT … '/$bunfs/root/templates/package.json.ejs'`, after the app
     * directory was created). It also `copy()`s non-`.ejs` assets.
     */
    readsEmbeddedTemplates: false,
  },
} as const;
