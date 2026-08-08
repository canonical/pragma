/**
 * Build script for the `pragma` compiled binary.
 *
 * Two steps: (1) codegen from the declaration, then (2) compile the CLI entry
 * (`src/bin.ts`) into a standalone executable with `Bun.build`.
 *
 * THE ASYMMETRY THE CODEGEN EXISTS FOR. `bun build --compile` bundles only
 * LITERAL import specifiers — a computed `import(name)` leaves the module out of
 * the binary (measured: `Cannot find module '@canonical/summon-component' from
 * '/$bunfs/root/…'`). This build, by contrast, runs on a real filesystem where a
 * computed specifier resolves fine. So the build READS the declaration and
 * WRITES the literals: a fork decides which generator packages the binary
 * carries by editing `pragma.conf.ts` and rebuilding, and nothing under
 * `src/capabilities/create/` names a generator package at all. The premise that
 * "a declaration can never decide what a compiled binary runs" is false, and
 * this script is the disproof.
 *
 * THREE GENERATED MODULES, THREE IMPORT DISCIPLINES:
 *  - `create/generators.generated.ts` — a VALUE module of literal
 *    `import { generators } from "<declared package>"` lines. Reached only
 *    through `pickGenerator.ts`, i.e. only behind `create`'s lazy boundary.
 *  - `create/surface.generated.ts` — a DATA module with ZERO imports, carrying
 *    each noun's prompt mirror, axis values, path param, summary and examples.
 *    Statically imported by `create.verb.ts`, so `--help` and `__complete` read
 *    the surface without loading a generator.
 *  - `create/templates.embedded.generated.ts` — every declared generator's
 *    templates AND verbatim assets inlined as strings, the same
 *    inline-strings-survive-`--compile` technique as
 *    `graphpack/embedded/pack.generated.ts`, keyed by PACKAGE-SCOPED path.
 *    Generators resolve their reads through `@canonical/summon-core/embedded`,
 *    which consults it when the disk read fails; the package scope lets one
 *    manifest serve several packages, and the path tail keeps react/svelte/lit
 *    apart. `create/compiledCreate.subprocess.test.ts` proves every shipped noun
 *    byte-identical to a source run.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deriveEmbeddedKey } from "@canonical/summon-core/embedded";
import { parseRawConfig } from "../src/kernel/config/schema.js";
import type { GeneratorDeclaration } from "../src/kernel/config/types.js";
import { emitReference } from "../src/kernel/spec/emitReference.js";
import {
  DEFAULT_GENERATED_DIR,
  GENERATED_MODULES,
  GENERATORS_MODULE,
  MANIFEST_MODULE,
  SURFACE_MODULE,
} from "./constants.js";
import {
  assertDeclaredGenerators,
  assertHarvestMatchesSources,
} from "./declaredGenerators.js";
import {
  generateCreateSurface,
  writeWhenChanged,
} from "./generateCreateSurface.js";

const scriptsUrl = new URL(".", import.meta.url);

/**
 * A distribution this build compiles: where its declaration lives, where its
 * generated modules land, and what binary it produces.
 *
 * THE CONF IS A PARAMETER OF THE BUILD, NOT AN IMPORT OF IT. That is the whole
 * thesis stated in the one script that can state it: `--fork <dir>` builds THIS
 * distribution's binary with `<dir>`'s CREATE SURFACE substituted — it reads the
 * `generators` declaration in `<dir>/pragma.conf.ts`, checks it against
 * `<dir>/package.json`, writes ITS generated modules into `<dir>`, and aliases
 * the three of them at bundle time.
 * `src/capabilities/create/forkGenerator.subprocess.test.ts` uses it to prove a
 * fork adds a `create` noun by editing one file.
 *
 * THE CREATE SURFACE, AND NOTHING ELSE. Identity, help, colophon, packs,
 * prefixes and vocabulary still come from THIS package's `pragma.conf.ts`,
 * because `src/bin.ts` pulls it statically through `kernel/config/defaults.ts`,
 * `constants.ts`, `render/prefixes.ts` and `kernel/vocabulary.ts`, and this
 * plugin does not touch that edge. Measured on the fixture, which declares no
 * identity at all: `./dist/pragma-fork --help` prints this distribution's own
 * front door and `config show` reports this distribution's three packs, while
 * `create --help` lists only the fork's `monorepo`. That asymmetry is precisely
 * what makes the fixture a test of the CREATE SEAM alone.
 *
 * WHAT `--fork` IS NOT: a general out-of-tree build facility. RESOLUTION stays
 * with THIS package — the codegen imports each declared package by name from
 * `scripts/`, the template harvest reads `../node_modules/<name>/src`, and the
 * bundler resolves the generated module's bare specifiers from `<dir>`. So
 * `<dir>` must sit inside this package's resolution scope; measured, an
 * otherwise-identical fork at an external path completed codegen and harvest
 * and then failed to bundle with `Could not resolve: "@canonical/summon-…"`.
 * The manifest that is CHECKED is therefore not always the manifest that
 * GOVERNS linking, and the in-repo fixture is the case where they differ: it
 * declares its generator under `dependencies` while this package carries it as
 * a `devDependency`, which is what actually links.
 */
interface BuildTarget {
  /** Directory holding `pragma.conf.ts` and `package.json`. */
  readonly dir: string;
  /** Where the three generated modules are written. */
  readonly generatedDir: string;
  /** The compiled binary's path. */
  readonly outfile: string;
  /**
   * Which distribution is being built — the ONE discriminant, read at both
   * sites that branch on it: `"shipped"` regenerates the committed
   * `docs/reference/` tree, `"fork"` installs the plugin that aliases the three
   * generated create modules to the ones written beside the fork's declaration.
   *
   * ONE FIELD, and that is a correction twice over. The alias plugin was first
   * selected by `TARGET.reference ? [] : [aliasGeneratedModules()]` — a
   * documentation flag deciding a linking policy, which the next reason to skip
   * the docs (a faster shipped build) would have turned into fork aliasing for
   * the shipped distribution; this plugin's own docblock records that a
   * mis-scoped alias produced a binary that built, type-checked and ran while
   * serving one importer the wrong surface. Splitting it into two booleans fixed
   * the coupling and left the two fields exact inverses at every construction,
   * so the bug was still expressible. A discriminant cannot be set to a
   * contradiction at all.
   */
  readonly kind: "shipped" | "fork";
}

/**
 * Read the build target from `process.argv`.
 *
 * @param argv - The arguments after the script name.
 * @returns The distribution to build.
 * @throws Error when `--fork` or `--outfile` is given without a value.
 */
function readBuildTarget(argv: readonly string[]): BuildTarget {
  const packageDir = fileURLToPath(new URL("..", scriptsUrl));
  const forkAt = argv.indexOf("--fork");
  const outAt = argv.indexOf("--outfile");
  const outfileArg = outAt === -1 ? undefined : argv.at(outAt + 1);
  if (outAt !== -1 && outfileArg === undefined) {
    throw new Error("--outfile needs a path.");
  }
  if (forkAt === -1) {
    return {
      dir: packageDir,
      generatedDir: DEFAULT_GENERATED_DIR,
      outfile: outfileArg ?? "dist/pragma",
      kind: "shipped",
    };
  }
  const forkArg = argv.at(forkAt + 1);
  if (forkArg === undefined) throw new Error("--fork needs a directory.");
  const dir = isAbsolute(forkArg) ? forkArg : resolve(process.cwd(), forkArg);
  return {
    dir,
    generatedDir: dir,
    outfile: outfileArg ?? join(dir, "pragma"),
    // A fork's reference tree is its own; regenerating THIS package's committed
    // `docs/reference/` from a fork's surface would corrupt the distribution.
    kind: "fork",
  };
}

/**
 * The target distribution's `generators`, VALIDATED and then asserted against
 * ITS OWN `package.json#dependencies` on EVERY build, so a declaration naming a
 * package the binary would not link fails here rather than at a user's `create`.
 *
 * `parseRawConfig` runs FIRST, and it is the fix to a measured gap: the noun
 * grammar's `key` XOR `keyPrefix`+`axis` rule lives in `kernel/config/schema.ts`
 * and reached the SHIPPED conf only, through `kernel/config/defaults.ts`. A
 * fork's conf is never a config layer — it is a build parameter — so its
 * declaration was validated at no point in its life, and a noun declaring
 * neither form surfaced as `…'s generator "undefined/…", which that package does
 * not export`: a message about a missing generator rather than about the config
 * that is wrong, which is exactly what the schema's docblock says it prevents.
 *
 * @param dir - The target distribution's directory.
 * @returns The declared generator packages, in declaration order.
 * @note Impure — imports the target's config and reads its package manifest.
 */
async function readDeclaredGenerators(
  dir: string,
): Promise<readonly GeneratorDeclaration[]> {
  const confPath = join(dir, "pragma.conf.ts");
  const conf = (
    (await import(pathToFileURL(confPath).href)) as { default: unknown }
  ).default;
  const declared =
    parseRawConfig(conf, confPath, "distribution").generators ?? [];
  const manifest = JSON.parse(
    readFileSync(join(dir, "package.json"), "utf-8"),
  ) as { dependencies?: Record<string, string> };
  assertDeclaredGenerators(declared, manifest.dependencies ?? {});
  return declared;
}

/**
 * Every directory named `templates` under a package's `src/`, deepest paths
 * included. DISCOVERED rather than assumed: `@canonical/summon-component` and
 * `@canonical/summon-package` keep theirs at `src/templates`, but
 * `@canonical/summon-application` keeps its React scaffold's at
 * `src/application/react/templates`, so a hardcoded `src/templates` finds
 * nothing for it. Recursion stops AT a `templates` directory, so a template
 * that is itself named `templates` can never become a second root and split one
 * package's files across two harvests.
 *
 * @param dir - The directory to search.
 * @returns The template roots found under it, in `readdir` order.
 * @note Impure — walks the filesystem.
 */
function collectTemplateRoots(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    if (entry.name === "templates") out.push(full);
    else out.push(...collectTemplateRoots(full));
  }
  return out;
}

/** A declared package and one of its template roots. */
interface TemplateRoot {
  /** The declaring package, which scopes every key harvested from `root`. */
  readonly name: string;
  /** Absolute path to a directory named `templates`. */
  readonly root: string;
}

/**
 * Every declared package's template roots.
 *
 * Roots are reached through this package's own `node_modules`, which bun links
 * to the sibling workspace directory, and read from the package's `src` — the
 * source of truth, identical to any dist copy, and the reason the key rule looks
 * only at the tail after the last `/templates/`. That is a MONOREPO BUILD path,
 * not npm resolution: the published tarballs ship `dist` only, so only a
 * checkout satisfies it.
 *
 * Keys come from `@canonical/summon-core/embedded`'s own `deriveEmbeddedKey`,
 * the same function the registry applies to a file's runtime source path — so
 * harvest and lookup agree by construction rather than by two hand-written
 * rules that happen to match. The package scope is what lets several generator
 * packages share ONE manifest.
 *
 * @param declared - The declared generator packages.
 * @returns Every root, paired with the package that declares it.
 * @note Impure — walks each declared package's linked source tree.
 */
function collectDeclaredTemplateRoots(
  declared: readonly GeneratorDeclaration[],
): readonly TemplateRoot[] {
  return declared.flatMap(({ name }) =>
    collectTemplateRoots(resolveDeclaredSrcDir(name)).map((root) => ({
      name,
      root,
    })),
  );
}

/**
 * Resolve a declared package's linked source tree.
 *
 * @param name - The declared package name.
 * @returns The absolute path to its `src`, through this package's node_modules.
 */
function resolveDeclaredSrcDir(name: string): string {
  return fileURLToPath(new URL(`../node_modules/${name}/src`, scriptsUrl));
}

/**
 * Assert each DECLARED package's template tree and its sources agree about the
 * embedded registry.
 *
 * Over every declaration, not only the harvested ones, and that scope is the
 * correction: scoping to packages with roots made the harvest's own blind spot
 * unreachable, because a package the walk found nothing for was exactly the one
 * it skipped. {@link assertHarvestMatchesSources} carries both directions.
 *
 * @param declared - The declared generator packages.
 * @param roots - Every declared package's template roots.
 * @throws Error naming a package whose sources and template tree disagree.
 * @note Impure — reads each declared package's source tree.
 */
function assertDeclaredPackagesServeTemplates(
  declared: readonly GeneratorDeclaration[],
  roots: readonly TemplateRoot[],
): void {
  const harvested = new Set(roots.map((entry) => entry.name));
  for (const { name } of declared) {
    assertHarvestMatchesSources(
      name,
      resolveDeclaredSrcDir(name),
      harvested.has(name),
    );
  }
}

/**
 * Recursively collect EVERY file path under a directory.
 *
 * Not `.ejs` only: `@canonical/summon-application` reads 62 VERBATIM assets
 * (28 `.ts`, 22 `.tsx`, 3 `.patch`, 2 `.gitkeep`, 2 `.css`, and one each of
 * `.txt`/`.json`/`.graphql`/`.browserslistrc`/`gitignore`) alongside its 15
 * `.ejs` templates, and a binary missing them scaffolds an application that is
 * four fifths absent. Empty files (`.gitkeep`) are embedded like any other; the
 * registry keys off `undefined`, not falsiness, so they are served rather than
 * reported missing.
 *
 * @param dir - The directory to walk.
 * @returns Every file path beneath it.
 * @note Impure — walks the filesystem.
 */
function collectTemplateFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectTemplateFiles(full));
    else out.push(full);
  }
  return out;
}

/**
 * Read a template as text, refusing anything that is not valid UTF-8.
 *
 * The manifest carries STRINGS, and the interpreter writes them back with
 * `writeFile(dest, content, "utf-8")`. A binary asset (an icon, a PNG) survives
 * a source run — that takes the `copyFile` branch and is byte-exact — and is
 * silently corrupted by the compiled binary, which serves it through the
 * manifest. Measured on a 33-byte PNG header round-tripped through exactly that
 * pair: 33 bytes in, 35 out. Loud at build time, in the same register as the key
 * collision beside it, because the alternative is a corrupt file in a user's
 * scaffold with nothing red anywhere.
 *
 * No declared generator ships a non-UTF-8 template today (checked: all 108
 * harvested files decode), which is exactly why this is cheap to keep true.
 *
 * @param file - The template path.
 * @returns Its contents as text.
 * @throws Error naming the file when its bytes are not valid UTF-8.
 * @note Impure — reads the filesystem.
 */
function readTemplateText(file: string): string {
  const bytes = readFileSync(file);
  const text = bytes.toString("utf-8");
  if (!Buffer.from(text, "utf-8").equals(bytes)) {
    throw new Error(
      `Template ${file} is not valid UTF-8. The embedded manifest carries TEXT only, so the compiled binary would write back a corrupted copy while a source run copies the bytes intact. Keep binary assets out of a harvested \`templates\` tree.`,
    );
  }
  return text;
}

/**
 * Inline every template and verbatim asset of the bindings that read through
 * the embedded registry into the generated manifest module. Deterministic
 * (sorted keys, `JSON.stringify` values) so re-running produces byte-identical
 * output — no working-tree churn.
 *
 * @param roots - Every declared package's template roots.
 * @param outPath - The manifest module to write.
 * @returns The number of files embedded.
 * @note Impure — reads every declared package's template roots and writes the
 *   manifest module.
 */
function generateTemplateManifest(
  roots: readonly TemplateRoot[],
  outPath: string,
): number {
  const entries: Record<string, string> = {};
  for (const { name, root } of roots) {
    const files = collectTemplateFiles(root);
    // Fail loud PER ROOT rather than ship a manifest missing a binding's
    // files: the binary's `create <id>` would otherwise die with "Embedded file
    // not found" at run time. A missing or renamed root throws ENOENT out of
    // `collectTemplateRoots` first, naming the path; this covers the root that
    // exists and holds nothing.
    if (files.length === 0) {
      throw new Error(
        `No template files under ${root} for ${name} — is the workspace linked?`,
      );
    }
    for (const file of files) {
      // HARVEST AND LOOKUP AGREE BY CONSTRUCTION, because they are now the same
      // function: `deriveEmbeddedKey` is what the registry applies to whatever
      // absolute path a generator computes at run time, so applying it here
      // removes the second, hand-written rule this build used to carry. That
      // rule (`relative(root, file)`) KEPT an inner directory named `templates`
      // where the registry slices after the LAST `/templates/` and drops it — a
      // disagreement that only ever showed in a COMPILED binary ("Embedded file
      // not found"), with a clean source run, and needed a third piece of code
      // to detect. What remains undecidable is a COLLISION: two harvested files
      // the one rule maps onto one key. That is still a build error.
      const key = deriveEmbeddedKey(name, file);
      if (key === undefined) {
        throw new Error(
          `Template ${file} is not under a \`templates\` directory, so \`@canonical/summon-core/embedded\` can derive no key for it. The harvest root was ${root}.`,
        );
      }
      if (entries[key] !== undefined) {
        throw new Error(
          `Templates in ${name} collide on the embedded key "${key}" (${file} is the second). The registry keys off the path after the last \`/templates/\`, so a nested \`templates\` directory can map two files onto one key — the compiled binary would serve one of them for both. Rename the directory.`,
        );
      }
      entries[key] = readTemplateText(file);
    }
  }

  const body = Object.keys(entries)
    .sort()
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(entries[key])},`)
    .join("\n");

  const module = `// AUTO-GENERATED by scripts/build.ts — do not edit by hand.
// Regenerate: \`bun run scripts/build.ts\`. Inlines every template and verbatim
// asset of the declared generator packages as strings, so \`pragma create\` works
// from the standalone --compile binary — whose virtual filesystem carries no
// template files at all. Keys are package-scoped, matching what
// \`@canonical/summon-core/embedded\` derives from a file's runtime source path.
/** Package-scoped file path → file contents. */
export const TEMPLATES: Record<string, string> = {
${body}
};
`;
  writeWhenChanged(outPath, module);
  return Object.keys(entries).length;
}

/** The committed reference tree the generator writes back. */
const REFERENCE_DIR = fileURLToPath(new URL("../docs/reference/", scriptsUrl));

/**
 * Write the generated Markdown reference (`emitReference(capabilities)`) into
 * `docs/reference/`, one file per page. Deterministic, so — like
 * {@link generateTemplateManifest} — a page is written ONLY when its bytes
 * differ, keeping a rebuild a working-tree no-op. Any committed `.md` the
 * emitter no longer produces (a removed noun's page) is pruned, so the tree
 * self-heals instead of leaning on the drift-guard to catch the orphan.
 *
 * ASYNC because the capability grammar is imported HERE and not at module load.
 * `capabilities/create/create.verb.ts` reads `surface.generated.ts`, which the
 * codegen above writes — so a static import would bind the PREVIOUS surface
 * before the build had a chance to replace it. Measured: adding a field the
 * verb builder reads made the build itself crash on the stale module it was
 * about to overwrite, and the only way out was to run the codegen by hand
 * first. The reference emitter must read what this build just generated.
 *
 * @returns The number of pages actually written (changed).
 * @note Impure — imports the live grammar, reads, writes, and prunes the
 *   `docs/reference` tree.
 */
async function writeReferenceDocs(): Promise<number> {
  const { capabilities } = await import("../src/capabilities/index.js");
  mkdirSync(REFERENCE_DIR, { recursive: true });
  const emitted = emitReference(capabilities);
  let written = 0;
  for (const [relPath, content] of emitted) {
    const out = join(REFERENCE_DIR, relPath);
    if (!existsSync(out) || readFileSync(out, "utf-8") !== content) {
      writeFileSync(out, content);
      written += 1;
    }
  }
  // Prune orphans deterministically: unlink any top-level `.md` the emitter did
  // not just produce (sorted for a stable order), so a removed page disappears
  // on the next build rather than lingering until the drift-guard flags it.
  for (const name of readdirSync(REFERENCE_DIR).sort()) {
    if (name.endsWith(".md") && !emitted.has(name)) {
      unlinkSync(join(REFERENCE_DIR, name));
    }
  }
  return written;
}

export { writeReferenceDocs };

/**
 * A `Bun.build` plugin resolving the three generated create modules to the
 * fork's copies.
 *
 * Scoped by BASENAME ALONE, and that scope is the CORRECTION TO A MEASURED BUG.
 * The first version also required the IMPORTER to sit in
 * `src/capabilities/create/`, on the reasoning that the create surface is read
 * only from there. It is not: `capabilities/hints.ts` imports
 * `../create/surface.generated.js` to derive the MCP `use_when` hints, so a fork
 * build silently handed that one importer the SHIPPED surface. The fork binary
 * built, type-checked, ran — and reported its own `create_monorepo` as
 * `category: "read"` with "(no hint authored — see capabilities/hints.ts)",
 * against a noun that mutates. A HALF-aliased module graph is worse than none,
 * because nothing fails.
 *
 * Safe at that scope because the three basenames are unique in this tree: the
 * only other generated modules are `pack.generated.ts`,
 * `pack.index.generated.ts` and `pack.stories.generated.ts` under
 * `runtime/graphpack/embedded/`, which a fork does not replace here and which no
 * filter over these three names can reach.
 *
 * @param generatedDir - Where the fork's generated modules were written.
 * @returns The plugin.
 */
function aliasGeneratedModules(generatedDir: string): import("bun").BunPlugin {
  return {
    name: "fork-generated-create-surface",
    setup(build) {
      build.onResolve({ filter: /\.generated\.js$/ }, (args) => {
        const basename = args.path.slice(args.path.lastIndexOf("/") + 1);
        const asSource = basename.replace(/\.js$/, ".ts");
        if (!GENERATED_MODULES.has(asSource)) return undefined;
        return { path: join(generatedDir, asSource) };
      });
    },
  };
}

// Only the actual build (not an `import` of `writeReferenceDocs` from the fast
// `genReference` script) reads the target, runs codegen and compiles the
// binary. EVERYTHING below is inside this block on purpose: reading argv,
// importing the target's conf, asserting its dependencies and walking three
// node_modules trees for template roots are all side effects of BUILDING, and
// as module-level consts they ran on a bare `import` of this file — so
// `genReference`, which wants one exported function, dynamic-imported a conf
// and could be diverted by a stray `--fork` in its own argv.
if (import.meta.main) {
  const TARGET = readBuildTarget(process.argv.slice(2));
  const DECLARED = await readDeclaredGenerators(TARGET.dir);
  mkdirSync(TARGET.generatedDir, { recursive: true });

  const nouns = await generateCreateSurface(DECLARED, TARGET.generatedDir);
  console.log(
    `Generated the create surface for ${nouns.join(", ")} → ${GENERATORS_MODULE} + ${SURFACE_MODULE}`,
  );

  const roots = collectDeclaredTemplateRoots(DECLARED);
  assertDeclaredPackagesServeTemplates(DECLARED, roots);
  const embedded = generateTemplateManifest(
    roots,
    join(TARGET.generatedDir, MANIFEST_MODULE),
  );
  console.log(`Embedded ${embedded} generator templates → ${MANIFEST_MODULE}`);

  if (TARGET.kind === "shipped") {
    const changedDocs = await writeReferenceDocs();
    console.log(
      `Wrote ${changedDocs} changed reference page(s) → docs/reference/`,
    );
  }

  const result = await Bun.build({
    entrypoints: [fileURLToPath(new URL("../src/bin.ts", scriptsUrl))],
    minify: true,
    // Code-splitting is load-bearing for cold-start: it emits the lazily
    // `import()`ed summon-core + generators (+ Ink/React) as SEPARATE chunks the
    // binary parses on demand, not at startup. Without it, bundling summon adds
    // ~135 ms to every invocation (blowing the __complete/--help budgets); with
    // it, the fast paths stay at/under their budgets while `create` loads summon
    // only when it runs.
    splitting: true,
    plugins:
      TARGET.kind === "fork"
        ? [aliasGeneratedModules(TARGET.generatedDir)]
        : [],
    compile: {
      target: "bun-linux-x64",
      outfile: TARGET.outfile,
    },
  });

  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log(`Built ${TARGET.outfile}`);
}
