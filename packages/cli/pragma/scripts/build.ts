/**
 * Build script for the `pragma` distribution.
 *
 * Three steps: (1) codegen the embedded template manifest, (2) emit the
 * reference docs, then (3) compile `src/` to `dist/` with `tsc`.
 *
 * WHAT SHIPS is emitted JavaScript on a `node` shebang — `dist/src/bin.js`,
 * the `bin` entry — not a standalone executable. `@canonical/summon` has always
 * shipped this way; pragma now matches it, so the two CLIs are one packaging
 * discipline. Dropping the executable drops the `os`/`cpu` linux-x64 lock with
 * it, and the ~105 MB artifact whose provenance the publish lane could not
 * prove (it had no build step for this package until `build:all` was added).
 *
 * COLD START is preserved by construction, not by a bundler flag. The compiled
 * build needed `splitting: true` so the lazily `import()`ed summon-core and
 * generators became separate chunks rather than startup cost. Under `tsc` every
 * module is already its own file behind those same lazy boundaries, so the fast
 * paths keep loading nothing they do not use.
 *
 * THE TEMPLATE MANIFEST'S REASON EXPIRED WITH THE BINARY, and step 1 is kept
 * for now rather than because it still earns its keep. It existed because
 * `--compile` gave the generators' `.ejs` no filesystem to live on.
 * `loadTemplateSync` reads the real file FIRST and reaches the manifest only
 * when that read throws — and the path it reads is derived from the RESOLVED
 * generator package, so whatever templates a consumer's resolution supplies are
 * the ones on disk and the ones that win. The manifest therefore pins nothing;
 * it fires only when a generator package's shipped templates cannot be read,
 * i.e. a broken or pruned install, where it silently serves this package's
 * frozen copy instead of failing loudly. Whether it survives at all belongs to
 * the create-surface work, which is changing what it covers; deciding it here
 * would settle that question from the wrong end.
 */

import { spawnSync } from "node:child_process";
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
 * The generators whose `.ejs` the manifest carries: exactly the bindings that
 * READ through it (`readsEmbeddedTemplates`). Keys are
 * `<id>/<path-relative-to-root>`, matching the qualified key the component
 * loader derives from a template's source path.
 *
 * The root is the declared package's `src/templates` — the source of truth,
 * identical to that package's dist copy — reached through this package's own
 * `node_modules`, which bun links to the sibling workspace directory. That is a
 * MONOREPO BUILD path, not npm resolution: the published tarballs ship `dist`
 * only (`"files": ["dist"]`), so only a checkout satisfies it. The binding's
 * `name` is the single declared fact it consumes.
 *
 * `summon-package` / `summon-application` are excluded deliberately: their
 * generators call `template({ source })`, which never consults the manifest, and
 * `qualifiedKey()` in summon-component prefixes every lookup with `component/` —
 * their entries were unreachable by construction (26 of the 46 once embedded).
 * They read their templates from disk, which is now the only path anything uses
 * by default.
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
    // templates: `create <id>` would otherwise die with "Template not found" at
    // run time on any consumer whose disk copy is missing. A missing or renamed root throws ENOENT out of
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
// \`pragma create component\` still resolves its templates when the on-disk copy
// under the generator package cannot be read. The disk read is tried FIRST.
/** Directory-qualified template path → file contents. */
export const TEMPLATES: Record<string, string> = {
${body}
};
`;
  // Write only when changed: the output is deterministic, so a rebuild is a
  // no-op — no working-tree churn, and no rewrite racing a concurrent import
  // (the create smoke test rebuilds while sibling create tests run).
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
// `genReference` script) runs codegen and emits `dist/`.
if (import.meta.main) {
  const embedded = generateTemplateManifest();
  console.log(
    `Embedded ${embedded} generator templates → templates.embedded.generated.ts`,
  );

  const changedDocs = writeReferenceDocs();
  console.log(
    `Wrote ${changedDocs} changed reference page(s) → docs/reference/`,
  );

  // `tsc` runs as a child rather than through the compiler API: the emit config
  // lives in `tsconfig.build.json` (one declaration, shared with editors and
  // `check:ts`), and a non-zero exit is the whole error contract we need.
  const emit = spawnSync("tsc", ["-p", "tsconfig.build.json"], {
    cwd: fileURLToPath(new URL("..", scriptsUrl)),
    stdio: "inherit",
    // Resolve the workspace's own tsc rather than whatever is on PATH — the
    // global `tsc` on a developer machine is frequently a different compiler.
    env: {
      ...process.env,
      PATH: `${fileURLToPath(new URL("../node_modules/.bin", scriptsUrl))}:${process.env.PATH ?? ""}`,
    },
  });

  if (emit.error || emit.status !== 0) {
    console.error(`Build failed${emit.error ? `: ${emit.error.message}` : ""}`);
    process.exit(1);
  }

  // The success sentinel, written LAST and only on a clean emit. `tsc` writes
  // its outputs even when it exits non-zero, so an output file's mtime cannot
  // tell a finished build from a failed one — a freshness check keyed on
  // `dist/src/bin.js` would call the wreckage of a failed build fresh, skip the
  // rebuild on the next run, and leave every spawning suite green against it.
  // The compiled build never needed this: `bun build` left its outfile alone on
  // failure, so a failure stayed loudly stale. `testing/perf/globalSetup.ts`
  // reads THIS file, not the entry.
  writeFileSync(fileURLToPath(new URL("../dist/.build-ok", scriptsUrl)), "");

  console.log("Built dist/ (tsc)");
}
