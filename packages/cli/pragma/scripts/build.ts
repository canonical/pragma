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
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import conf from "../pragma.conf.js";
import { assertDeclaredGenerators } from "../src/capabilities/create/declaredGenerators.js";
import { capabilities } from "../src/capabilities/index.js";
import { emitReference } from "../src/kernel/spec/emitReference.js";
import { generateCreateSurface } from "./generateCreateSurface.js";

const scriptsUrl = new URL(".", import.meta.url);

/**
 * The declared generator packages. Asserted against `package.json#dependencies`
 * on EVERY build, so a declaration that names a package the binary would not
 * link fails here rather than at a user's `create`.
 */
const DECLARED = conf.generators;
assertDeclaredGenerators(
  DECLARED,
  (
    JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../package.json", scriptsUrl)),
        "utf-8",
      ),
    ) as { dependencies?: Record<string, string> }
  ).dependencies ?? {},
);

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
 * Keys are `<package>/<path-relative-to-root>` — the same rule
 * `@canonical/summon-core/embedded`'s `deriveEmbeddedKey` applies to a file's
 * runtime source path, so harvest and lookup agree by construction. The package
 * scope is what lets several generator packages share ONE manifest.
 */
const TEMPLATE_ROOTS: ReadonlyArray<{ name: string; root: string }> =
  DECLARED.flatMap(({ name }) =>
    collectTemplateRoots(
      fileURLToPath(new URL(`../node_modules/${name}/src`, scriptsUrl)),
    ).map((root) => ({ name, root })),
  );

const MANIFEST_OUT = fileURLToPath(
  new URL(
    "../src/capabilities/create/templates.embedded.generated.ts",
    scriptsUrl,
  ),
);

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
 * Inline every template and verbatim asset of the bindings that read through
 * the embedded registry into the generated manifest module. Deterministic (sorted keys,
 * `JSON.stringify` values) so re-running produces byte-identical output — no
 * working-tree churn.
 *
 * @returns The number of files embedded.
 */
function generateTemplateManifest(): number {
  const entries: Record<string, string> = {};
  for (const { name, root } of TEMPLATE_ROOTS) {
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
      const rel = relative(root, file).split(/[\\/]/).join("/");
      entries[`${name}/${rel}`] = readFileSync(file, "utf-8");
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
  // Write only when changed: the output is deterministic, so a rebuild is a
  // no-op — no working-tree churn, and no rewrite racing a concurrent import
  // (the compiled-binary smoke test rebuilds while sibling create tests run).
  if (
    !existsSync(MANIFEST_OUT) ||
    readFileSync(MANIFEST_OUT, "utf-8") !== module
  ) {
    writeFileSync(MANIFEST_OUT, module);
  }
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
 * @returns The number of pages actually written (changed).
 * @note Impure — reads, writes, and prunes the `docs/reference` tree.
 */
function writeReferenceDocs(): number {
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

// Only the actual build (not an `import` of `writeReferenceDocs` from the fast
// `genReference` script) runs codegen and compiles the binary.
if (import.meta.main) {
  const nouns = await generateCreateSurface();
  console.log(
    `Generated the create surface for ${nouns.join(", ")} → generators.generated.ts + surface.generated.ts`,
  );

  const embedded = generateTemplateManifest();
  console.log(
    `Embedded ${embedded} generator templates → templates.embedded.generated.ts`,
  );

  const changedDocs = writeReferenceDocs();
  console.log(
    `Wrote ${changedDocs} changed reference page(s) → docs/reference/`,
  );

  const result = await Bun.build({
    entrypoints: ["src/bin.ts"],
    minify: true,
    // Code-splitting is load-bearing for cold-start: it emits the lazily
    // `import()`ed summon-core + generators (+ Ink/React) as SEPARATE chunks the
    // binary parses on demand, not at startup. Without it, bundling summon adds
    // ~135 ms to every invocation (blowing the __complete/--help budgets); with
    // it, the fast paths stay at/under their budgets while `create` loads summon
    // only when it runs.
    splitting: true,
    compile: {
      target: "bun-linux-x64",
      outfile: "dist/pragma",
    },
  });

  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log("Built dist/pragma");
}
