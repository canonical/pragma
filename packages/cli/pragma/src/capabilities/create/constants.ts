/**
 * The generator bindings the `create` surface exposes — the one list the
 * surface's mechanical copies derive from: the `CreateKind` union (`types.ts`),
 * the `--framework` enum and the compiled-binary gate (`create.verb.ts`), the
 * generator lookup (`pickGenerator.ts`), and the template roots the bundler
 * embeds (`scripts/build.ts`). Prose is NOT derived: the verb summaries below
 * `createVerbs` and `capabilities/hints.ts` still name the frameworks by hand.
 *
 * DECLARED, THEN BOUND. `pragma.conf.ts` declares which generator PACKAGES the
 * distribution ships (`generators: [{ name, source }]`) and is the SINGLE
 * authoring point for their names: this table no longer spells one. It zips the
 * declaration, IN DECLARATION ORDER, onto each noun's per-noun facts, so the
 * `create` surface reads its package names from content rather than from a
 * hand-copy that could disagree with what the distribution says it ships.
 *
 * What is zipped is only the NAME. The per-noun facts stay here because they are
 * facts about the GENERATOR and about this surface, not content a fork authors:
 *  - `key` / `frameworks` are which generators the package exports, and
 *    surfacing a noun also needs a hand-written prompt mirror, path param and
 *    examples in `create.verb.ts`, so the surface is a deliberate SUBSET —
 *    `summon-application` ships `application/react`, `domain`, `route` and
 *    `wrapper`, and `create` exposes one of them;
 *  - `readsEmbeddedTemplates` is a property of the generator's source (see each
 *    binding), not of what this build chooses to embed.
 *
 * THE RESIDUE, stated plainly: `pickGenerator.ts` must still write three literal
 * import specifiers, because `bun build --compile` bundles only statically
 * analysable ones — `import(name)` on a declared package leaves the generators
 * out of the binary (measured: `Cannot find module
 * '@canonical/summon-component' from '/$bunfs/root/…'`). Since the zip is
 * POSITIONAL, a reordered declaration would silently re-bind every noun. So
 * `assertDeclaredGenerators` — run by `scripts/build.ts` before it emits
 * anything, and again by `create.test.ts` — holds those three literals, per
 * noun, to the names this table binds, and holds each declared `source` to the
 * dependency the build actually links.
 *
 * `create.test.ts` pins the rest of what is checkable: every binding resolves to
 * the generator it names, and the embedded manifest carries only the templates
 * of the binding that reads through it.
 *
 * ONE VALUE import, and it must stay one: `create.verb.ts` reads this on the
 * `--help` / `__complete` fast path, where `pragma.conf.ts` already sits (`src/
 * constants.ts` projects identity from it) and costs nothing extra to
 * dereference. Nothing heavier may arrive — `PragmaError` included; the loud
 * failure for a short declaration is the bare `Error` below.
 *
 * That is now ENFORCED rather than asserted. The docblock used to cite
 * `capabilities/lazy.test.ts` for it, and that test constrained nothing here:
 * `PragmaError` is already on the graph it walks (measured — 129 files from
 * `capabilities/index.ts`, `kernel/error/PragmaError.ts` among them), so the
 * one edit this paragraph forbids failed no assertion. `lazy.test.ts` now
 * enumerates this module's static graph exactly, the same way it already does
 * `pragma.conf.ts`'s, and watches `capabilities/index.ts` — the actual root of
 * the fast path — for the embedded n-quads module its own +23 ms measurement is
 * about. The `RawConfig` import below is TYPE-ONLY and erased; the exact
 * enumeration is what keeps it that way.
 */
import conf from "../../../pragma.conf.js";
import type { RawConfig } from "../../kernel/config/types.js";

/**
 * The name declared at `index`, or a loud failure.
 *
 * A fork that declares fewer generators than this surface binds would otherwise
 * bind `undefined` as a package name and fail later, somewhere else. This throw
 * is the FIRST and only thing such a fork sees — including under `bun run
 * build`, which imports `CREATE_GENERATORS` at its own top level and therefore
 * evaluates this module before `checkDeclaredGenerators()` in its
 * `import.meta.main` body ever runs. The docblock used to promise the build
 * guard would catch it "first and say more"; ES module evaluation order forbids
 * that, so the message says it here instead. It is also what a badly-declared
 * fork hits on `--help`, with no other output to orient from.
 *
 * `generators` is read through {@link RawConfig} rather than off the literal for
 * the reason `src/constants.ts` reads `colophon` that way: `satisfies RawConfig`
 * yields the literal's type, so `conf.generators[index]` is a TS2339 for a fork
 * that omits the field, and at runtime a bare TypeError on the fast path —
 * before `?.` can help. Through the contract it is `undefined`, and the named
 * Error below fires as documented.
 *
 * @param index - Position in the declaration.
 * @returns The declared package name.
 * @throws Error naming the file, the shortfall and the edit.
 */
function declaredGeneratorName(index: number): string {
  const declared = (conf as RawConfig).generators ?? [];
  const name = declared[index]?.name;
  if (name === undefined) {
    throw new Error(
      `pragma.conf.ts declares ${declared.length} generators; the create surface binds ${index + 1}. Declare the missing generator(s) under "generators", in the order create binds its nouns (component, package, application), or rebind the nouns in capabilities/create.`,
    );
  }
  return name;
}

export const CREATE_GENERATORS = {
  component: {
    /**
     * The declaring package, read from the distribution's `generators`:
     * `scripts/build.ts` harvests its `.ejs` for the binary.
     */
    name: declaredGeneratorName(0),
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
    /** The declaring package, read from the distribution's `generators`. */
    name: declaredGeneratorName(1),
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
    readsEmbeddedTemplates: false,
  },
  application: {
    /** The declaring package, read from the distribution's `generators`. */
    name: declaredGeneratorName(2),
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
