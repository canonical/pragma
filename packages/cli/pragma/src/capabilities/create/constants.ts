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
 *  - `pickGenerator` imports all three generators STATICALLY. The historical
 *    cause was `bun build --compile`, which bundles only statically analysable
 *    specifiers and so could never `import(name)` a declared package; the
 *    static form is kept because a computed specifier defeats every bundler
 *    and is worth nothing here.
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
    /** The generator-map key `create package` runs. */
    key: "package",
    /**
     * Reads templates by PATH, not through the embedded manifest: this generator
     * calls `template({ source })` with no `content:`, so summon-core goes
     * straight to `readFile(options.source)`. Embedding its templates would be
     * dead weight — nothing would ever look them up.
     */
    readsEmbeddedTemplates: false,
  },
  application: {
    /** The generator-map key `create application` runs. */
    key: "application/react",
    /**
     * Reads templates by PATH — same as `package`, and it also `copy()`s
     * non-`.ejs` assets, which no manifest of `.ejs` strings could carry.
     */
    readsEmbeddedTemplates: false,
  },
} as const;
