/**
 * The generator bindings the `create` surface exposes — the ONE list every other
 * copy of these facts derives from: the {@link CreateKind} union (`types.ts`),
 * the `--framework` enum and the compiled-binary gate (`create.verb.ts`), the
 * generator lookup (`pickGenerator.ts`), and the template roots the bundler
 * embeds (`scripts/build.ts`).
 *
 * DECLARED vs BOUND. `pragma.conf.ts` declares which generator PACKAGES the
 * distribution ships (`generators: [{ name, source }]`); this binds each `create`
 * noun to one of them — by `name`; `source` is consumed by pack resolution, not
 * by `create` — and to the generator-map key it runs. The binding is
 * hand-written because neither half can be discovered:
 *  - surfacing a noun also needs a hand-written prompt mirror, path param and
 *    examples in `create.verb.ts`, so the surface is a deliberate SUBSET —
 *    `@canonical/summon-application` ships `application/react`, `domain`, `route`
 *    and `wrapper`, and `create` exposes one of them;
 *  - `bun build --compile` bundles only statically analysable import specifiers,
 *    so a shipped binary can never `import(name)` a declared package (measured:
 *    `Cannot find module '@canonical/summon-component' from '/$bunfs/root/…'`).
 *    {@link pickGenerator} must import all three statically.
 *
 * `create.test.ts` pins the half that IS checkable: every `name` below is
 * declared in `pragma.conf.ts`, and every binding resolves to a real generator.
 *
 * Deliberately free of any import: `create.verb.ts` reads this on the `--help` /
 * `__complete` fast path (`capabilities/lazy.test.ts`).
 */
export const CREATE_GENERATORS = {
  component: {
    /** The declaring package, as named in `pragma.conf.ts` `generators`. */
    name: "@canonical/summon-component",
    /** `--framework <f>` runs `component/<f>`; the FIRST is the enum default. */
    frameworks: ["react", "svelte", "lit"],
    /**
     * Runs from the compiled binary: this generator routes every template read
     * through `loadTemplateSync` and passes `content:` into `template()`, so the
     * embedded manifest serves it. That — not the templates' file extensions —
     * is the property that decides it.
     */
    embedsTemplates: true,
  },
  package: {
    name: "@canonical/summon-package",
    /** The generator-map key `create package` runs. */
    key: "package",
    /**
     * NOT runnable from the compiled binary: this generator calls
     * `template({ source })` with no `content:`, so summon-core falls through to
     * `readFile(options.source)`. Measured against a real `dist/pragma` with the
     * gate lifted: `ENOENT: no such file or directory, open
     * '/$bunfs/templates/package.json.ejs'`, after `mkdir` had already created
     * `my-lib/` and `my-lib/src/` — a half-made package left on disk. A
     * `--dry-run` exits 0 without reading a template, so it does NOT test this.
     */
    embedsTemplates: false,
  },
  application: {
    name: "@canonical/summon-application",
    key: "application/react",
    /**
     * NOT runnable from the compiled binary — same cause as `package` (measured:
     * `ENOENT … '/$bunfs/root/templates/package.json.ejs'`, after the app
     * directory was created). It also `copy()`s non-`.ejs` assets.
     */
    embedsTemplates: false,
  },
} as const;
