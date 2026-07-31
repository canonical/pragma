/**
 * Build script for the `pragma` compiled binary.
 *
 * Two steps: (1) codegen the embedded template manifest, then (2) compile the
 * CLI entry (`src/bin.ts`) into a standalone executable with `Bun.build`.
 *
 * COMPILED `create` (PR7, resolved) — `create component` runs from the shipped
 * binary. `create.verb.ts` reaches summon-core + the generators through STATIC
 * dynamic imports (behind its lazy boundary), so bun's `--compile` bundler
 * includes them. The generators load their `.ejs` templates from disk
 * (`import.meta`-relative), which do not exist in a standalone binary, so this
 * script inlines the reachable generator templates into `create/templates`
 * `.embedded.generated.ts` — the same inline-strings-survive-`--compile`
 * technique as `graphpack/embedded/pack.generated.ts` — keyed by
 * directory-qualified path (`component/react/types.ts.ejs`). The component
 * loader consults that manifest when its disk read fails, keyed by the qualified
 * path so react/svelte/lit never collide. A compiled-binary smoke test
 * (create/compiledCreate.subprocess.test.ts) proves the three frameworks are
 * byte-identical to a source run, and pins the refusal for the nouns that stay a
 * source-run feature.
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
import { CREATE_GENERATORS } from "../src/capabilities/create/constants.js";
import { capabilities } from "../src/capabilities/index.js";
import { emitReference } from "../src/kernel/spec/emitReference.js";

const scriptsUrl = new URL(".", import.meta.url);

/**
 * The generators whose `.ejs` the binary must carry: exactly the bindings
 * `create.verb.ts` lets run from the compiled binary
 * (`readsEmbeddedTemplates`). Keys are `<id>/<path-relative-to-root>`, matching
 * the qualified key the component loader derives from a template's source path.
 *
 * The root is the declared package's `src/templates` — the source of truth,
 * identical to that package's dist copy — reached through this package's own
 * `node_modules`, which bun links to the sibling workspace directory. That is a
 * MONOREPO BUILD path, not npm resolution: the published tarballs ship `dist`
 * only (`"files": ["dist"]`), so only a checkout satisfies it. The binding's
 * `name` is the single declared fact it consumes.
 *
 * `summon-package` / `summon-application` are excluded deliberately: their
 * generators call `template({ source })`, so a compiled binary can never read an
 * embedded template for them, and `qualifiedKey()` in summon-component prefixes
 * every lookup with `component/` — their entries were unreachable by
 * construction (26 of the 46 previously embedded).
 */
const TEMPLATE_ROOTS: ReadonlyArray<{ id: string; root: string }> =
  Object.entries(CREATE_GENERATORS).flatMap(([id, binding]) =>
    binding.readsEmbeddedTemplates
      ? [
          {
            id,
            root: fileURLToPath(
              new URL(
                `../node_modules/${binding.name}/src/templates`,
                scriptsUrl,
              ),
            ),
          },
        ]
      : [],
  );

const MANIFEST_OUT = fileURLToPath(
  new URL(
    "../src/capabilities/create/templates.embedded.generated.ts",
    scriptsUrl,
  ),
);

/** Recursively collect every `.ejs` file path under a directory. */
function collectEjs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectEjs(full));
    else if (entry.name.endsWith(".ejs")) out.push(full);
  }
  return out;
}

/**
 * Inline the `.ejs` templates of every binding that reads through the embedded
 * manifest into the generated manifest module. Deterministic (sorted keys,
 * `JSON.stringify` values) so re-running produces byte-identical output — no
 * working-tree churn.
 *
 * @returns The number of templates embedded.
 */
function generateTemplateManifest(): number {
  const entries: Record<string, string> = {};
  for (const { id, root } of TEMPLATE_ROOTS) {
    const files = collectEjs(root);
    // Fail loud PER ROOT rather than ship a manifest missing a binding's
    // templates: the binary's `create <id>` would otherwise die with "Template
    // not found" at run time. A missing or renamed root throws ENOENT out of
    // `collectEjs` first, naming the path; this covers the root that exists and
    // holds nothing. (Checking the total instead would be vacuous the moment a
    // second binding embeds.)
    if (files.length === 0) {
      throw new Error(
        `No .ejs templates under ${root} for \`create ${id}\` — is the workspace linked?`,
      );
    }
    for (const file of files) {
      const rel = relative(root, file).split(/[\\/]/).join("/");
      entries[`${id}/${rel}`] = readFileSync(file, "utf-8");
    }
  }

  const body = Object.keys(entries)
    .sort()
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(entries[key])},`)
    .join("\n");

  const module = `// AUTO-GENERATED by scripts/build.ts — do not edit by hand.
// Regenerate: \`bun run scripts/build.ts\`. Inlines the .ejs templates of the
// generators that read through this manifest (\`create component\`) as strings, so
// \`pragma create component\` works from the standalone --compile binary (the .ejs
// files are absent from the binary's virtual filesystem).
/** Directory-qualified template path → file contents. */
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
