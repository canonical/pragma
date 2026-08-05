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
 * THE RESIDUE, stated plainly: FOUR literal import specifiers survive across TWO
 * files, because `bun build --compile` bundles only statically analysable ones —
 * `import(name)` on a declared package leaves the generators out of the binary
 * (measured: `Cannot find module '@canonical/summon-component' from
 * '/$bunfs/root/…'`). Three are `pickGenerator.ts`'s generator maps, one per
 * bound noun; the fourth is `create.verb.ts`'s `import("<package>/embedded")`,
 * which injects the template manifest `scripts/build.ts` harvests — a different
 * literal for a different reason, and the one the guard could not see until it
 * read that file too. Since the zip is POSITIONAL, a reordered declaration would
 * silently re-bind every noun. So `assertDeclaredGenerators` — run by
 * `scripts/build.ts` before it emits anything, and again by `create.test.ts` —
 * holds all four to the names this table binds, and holds each declared `source`
 * to the dependency the build actually links.
 *
 * `create.test.ts` pins the rest of what is checkable: every binding resolves to
 * the generator it names, and the embedded manifest carries only the templates
 * of the binding that reads through it.
 *
 * A DELIBERATE LEAF: `create.verb.ts` reads this while the command tree is
 * BUILT, so whatever this module's graph contains is walked on every `--help`
 * and every `__complete`. `capabilities/lazy.test.ts` enumerates that graph
 * EXACTLY, so an import that pulls anything new fails there, named. That is a
 * leaf-ness bound, not a latency claim — and the distinction matters, because
 * this paragraph used to forbid `PragmaError` by name and justify the bare
 * `Error` below with a fast-path cost the file's own next paragraph disproved:
 * `create.verb.ts` imports `PragmaError` already, and `kernel/error/
 * PragmaError.ts` (plus the two type-only modules it reaches) is on the same
 * 129-file `capabilities/index.ts` graph. The edge costs nothing, so the loud
 * failure below is a `PragmaError.configError` carrying a code and a recovery,
 * the way `kernel/vocabulary.ts` — the sibling seam, a module-load validator of
 * a distribution declaration on that same graph — has always failed. What
 * neither seam gets yet is the rendered envelope: `bin.ts` dynamic-imports
 * `capabilities/index.js` outside its only try, so both throws surface as an
 * uncaught rejection. The gain here is the code, the recovery and one house
 * style for a bad declaration, not the envelope.
 *
 * The `RawConfig` import below is TYPE-ONLY and erased. The enumeration does NOT
 * keep it that way, and used to be cited as if it did: the walker reads
 * `from "…"` textually, so `import type { RawConfig }` and `import { CHANNELS }`
 * yield the identical file list — measured, both flipped to value imports with
 * this file and `completion/safety.test.ts` green. The enumeration bounds WHICH
 * modules may appear; a separate case, `the fast path's edges into kernel/config
 * are written "import type"`, walks every module on the four storeless entry
 * graphs and is what keeps the edge erased.
 */
import conf from "../../../pragma.conf.js";
import type { RawConfig } from "../../kernel/config/types.js";
import { PragmaError } from "../../kernel/error/PragmaError.js";

/**
 * The nouns this surface binds, IN THE ORDER the declaration is zipped onto
 * them. Exists so the shortfall message and the three call sites below derive
 * from one place: the message used to report the running index as the
 * requirement ("declares 1 generators; the create surface binds 2"), which
 * walked a fork through one rebuild per noun and contradicted its own trailing
 * clause. Positional zipping is what makes the order load-bearing —
 * `assertDeclaredGenerators` is what holds it.
 */
const BOUND_NOUNS = ["component", "package", "application"] as const;

/**
 * Read the name declared for `noun`, or fail loudly.
 *
 * This is a FUNCTION in a `constants.ts`, which cs:code.constants.file forbids,
 * and it stays here deliberately. Extracting it to a sibling module was tried
 * and measured: `lazy.test.ts`'s "the create binding table stays a leaf on the
 * fast path (PROTECTED)" pins this module's import graph to an EXACT file list
 * AND asserts that every file on it except this one has no value imports
 * (`/^import (?!type\b)/m`). The extracted module must value-import
 * `PragmaError` and `pragma.conf.ts`, so it failed that assertion even after
 * the enumeration was widened to admit it — the guard went red both ways. Only
 * this file is exempt, because only this file is the entry. Moving the function
 * out is therefore not a refactor, it is a request to weaken a PROTECTED
 * fast-path guard, and the guard is worth more than the file-role rule here.
 * The name is a verb, which is the half of the standards fix that costs nothing.
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
 * yields the literal's type, so `conf.generators` is a TS2339 for a fork
 * that omits the field, and at runtime a bare TypeError on the fast path —
 * before `?.` can help. Through the contract it is `undefined`, and the named
 * Error below fires as documented.
 *
 * @param noun - The bound noun, whose position in {@link BOUND_NOUNS} is the
 *   position it reads from the declaration.
 * @returns The declared package name.
 * @throws PragmaError CONFIG_ERROR naming the file, the full shortfall and the
 *   edit — the same seam and the same code `kernel/vocabulary.ts` raises for
 *   the other distribution declaration validated at module load.
 */
function readDeclaredGeneratorName(noun: (typeof BOUND_NOUNS)[number]): string {
  const declared = (conf as RawConfig).generators ?? [];
  const name = declared.at(BOUND_NOUNS.indexOf(noun))?.name;
  if (name === undefined) {
    throw PragmaError.configError(
      `Invalid config in pragma.conf.ts: it declares ${declared.length} generator(s); the create surface binds ${BOUND_NOUNS.length}, in this order: ${BOUND_NOUNS.join(", ")}.`,
      {
        recovery: {
          message: `In pragma.conf.ts, declare the missing generator(s) under "generators" in that order — or rebind the nouns in capabilities/create, where BOUND_NOUNS is the list.`,
        },
      },
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
    name: readDeclaredGeneratorName("component"),
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
    name: readDeclaredGeneratorName("package"),
    /** The generator-map key `create package` runs. */
    key: "package",
    /**
     * NOT runnable from the compiled binary: this generator calls
     * `template({ source })` with no `content:`, so summon-core falls through to
     * `readFile(options.source)`. Measured against a real `dist/pragma` with the
     * gate lifted: `ENOENT: no such file or directory, open
     * '/$bunfs/templates/package.json.ejs'`, after `mkdir` had already created
     * `my-lib/` and `my-lib/src/` — a half-made package left on disk. A
     * `--dry-run` DOES test this now, which is the PR7 change: `planTask`
     * performs the template `ReadFile` for real, so with the gate lifted a
     * preview dies on the same ENOENT with the same exit code as the run.
     * Verified from source on the branch tip — `create package --name
     * @acme/my-lib --dry-run` emits real `Read file:` effects for all five
     * `.ejs` templates and writes nothing. So what keeps `create package` from
     * being attempted in the binary is the gate ABOVE the interpreter, not the
     * plan's silence.
     */
    readsEmbeddedTemplates: false,
  },
  application: {
    /** The declaring package, read from the distribution's `generators`. */
    name: readDeclaredGeneratorName("application"),
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
