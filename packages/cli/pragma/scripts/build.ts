/**
 * Build script for the `pragma` compiled binary.
 *
 * Four steps: (1) codegen the create surface
 * (`createSurface.generated.ts`), (2) codegen the embedded template
 * manifest (`templates.embedded.generated.ts`), (3) emit the reference
 * docs (`docs/reference/`), then (4) compile the CLI entry (`src/bin.ts`)
 * into a standalone executable with `Bun.build` — the first three write
 * the three committed artifacts the drift guards read.
 *
 * ONE PASS IS SELF-CONSISTENT: the reference docs render the surface this
 * pass just produced. `capabilities` is imported at process start, so when
 * codegen rewrites `createSurface.generated.ts`, the docs are emitted by a
 * fresh `scripts/genReference.ts` child (which re-imports the rewritten
 * module) instead of this process's stale copy — a single `bun run build`
 * after a generator-surface edit leaves dist, surface, and docs/reference/
 * on the SAME generation. A GATE's build sets PRAGMA_BUILD_SKIP_DOCS=1 and
 * rewrites NONE of the three committed artifacts its drift guards read
 * (one scoped exception below): the two generated modules
 * (createSurface.generated.ts, templates.embedded.generated.ts) run in
 * CHECK mode (`scripts/codegen.ts` — importable so the seam is pinned by
 * unit cells) — a stale committed module FAILS the build loudly, naming
 * itself and `bun run build` as the repair — and the docs step writes
 * nothing, so every drift guard (create.test.ts's two PROTECTED cells,
 * reference.test.ts) compares the bytes git actually holds and can fail on
 * a stale committed tree. THE exception: a workspace version bump
 * legitimately stales the manifest's PACKAGE_VERSIONS block — no release
 * step rebuilds this package, NO drift guard compares that block as
 * bytes, and the PROTECTED offline cells pin the release line FROM it
 * against the live workspace manifests — so check mode REPAIRS a
 * versions-only difference (writes the assembled module; a NOTICE names
 * the three-line diff as the developer's to commit), keeping the gate,
 * the binary it builds, and the suite agreeing after a bump, while
 * TEMPLATES or surface staleness still fails writing nothing.
 *
 * COMPILED `create` — every binding runs from the shipped binary.
 * `create.verb.ts` reaches summon-core + the generators through STATIC dynamic
 * imports (behind its lazy boundary), so bun's `--compile` bundler includes
 * them. The generators load their templates from disk
 * (`import.meta`-relative), which does not exist in a standalone binary, so
 * this build inlines (via `scripts/codegen.ts`) EVERY declared root's
 * template tree into `create/templates.embedded.generated.ts` — the same
 * inline-strings-survive-`--compile` technique as
 * `graphpack/embedded/pack.generated.ts` — keyed by summon-core's qualified
 * scheme (`component/react/types.ts.ejs`, `package/tsconfig.json.ejs`,
 * `application/react/src/lib/index.ts.ejs`), so sibling basenames never
 * collide and one manifest serves all three packages. The compiled-binary
 * smoke test (create/compiledCreate.subprocess.test.ts) proves each binding
 * byte-identical to a source run.
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
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { capabilities } from "../src/capabilities/index.js";
import { emitReference } from "../src/kernel/spec/emitReference.js";
import {
  checkModeFromEnv,
  generateCreateSurface,
  generateTemplateManifest,
  TEMPLATE_ROOTS,
} from "./codegen.js";

const scriptsUrl = new URL(".", import.meta.url);

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
  // A GATE's build: check every committed artifact (the header's property)
  // — codegen fails loudly on a stale module (versions-only manifest
  // staleness is instead REPAIRED with a notice, the header's one scoped
  // exception), docs are skipped. Surface before manifest: a stale surface
  // throws here before any repair can happen. The flag read lives beside
  // the generators it flips (checkModeFromEnv) so the wiring is pinned by
  // the seam cells, not just this call site.
  const check = checkModeFromEnv(process.env);

  const { surfaced, changed: surfaceChanged } = generateCreateSurface({
    check,
  });
  console.log(
    `Projected ${surfaced} generator binding(s) → createSurface.generated.ts`,
  );

  const manifest = generateTemplateManifest({ check });
  const perRoot = TEMPLATE_ROOTS.map(
    ({ prefix }) =>
      `${prefix}: ${
        Object.keys(manifest).filter((key) => key.startsWith(`${prefix}/`))
          .length
      }`,
  ).join(", ");
  console.log(
    `Embedded ${Object.keys(manifest).length} generator templates (${perRoot}) → templates.embedded.generated.ts`,
  );

  if (check) {
    // A GATE's build (both vitest configs' globalSetup): writing docs here
    // would silently REPAIR a stale committed tree in the same run, before
    // reference.test.ts — the drift guard — reads it. The guard must compare
    // the bytes git actually holds; `bun run build` / `gen:reference` stay
    // the doc writers. (The codegen steps above enforce the same rule by
    // FAILING on a stale committed module rather than skipping.)
    console.log("Skipped reference docs (PRAGMA_BUILD_SKIP_DOCS=1)");
  } else if (surfaceChanged) {
    // The surface changed under this process's feet: `capabilities`
    // (imported at startup) still carries the PRE-regen projection, so an
    // in-process emit would render the docs one generation behind — and a
    // rerun would then "fix" them (the build-twice trap). A fresh child
    // re-imports the rewritten module and emits the post-regen truth in
    // this same pass.
    const docs = spawnSync("bun", ["run", "scripts/genReference.ts"], {
      cwd: fileURLToPath(new URL("..", scriptsUrl)),
      stdio: "inherit",
    });
    if (docs.error || docs.status !== 0) {
      console.error(
        `Reference docs emit failed${docs.error ? `: ${docs.error.message}` : ""}`,
      );
      process.exit(1);
    }
  } else {
    const changedDocs = writeReferenceDocs();
    console.log(
      `Wrote ${changedDocs} changed reference page(s) → docs/reference/`,
    );
  }

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
