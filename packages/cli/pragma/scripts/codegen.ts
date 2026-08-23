/**
 * The two committed-codegen generators the build runs (`scripts/build.ts` is
 * the one caller in a build; the gate-seam unit pins in
 * src/testing/perf/codegen.test.ts are the other importers). Extracted from
 * build.ts so the CHECK seam — the mechanism that keeps a gate's build from
 * silently repairing a stale committed module before the PROTECTED drift
 * guards read it (create.test.ts's projection-fidelity and
 * reader-derivability cells) — is an importable, injectable function a
 * millisecond unit cell can drive, instead of two unpinned lines only a
 * real stale gate build would ever exercise. Importing this module runs NO
 * build and writes nothing: each generator acts only when called, and `out`
 * is injectable so a cell drives check mode against seeded bytes in a
 * tmpdir while `bun run build` keeps writing the committed modules.
 *
 * CHECK MODE (`{ check: true }` — a gate's build, PRAGMA_BUILD_SKIP_DOCS=1
 * in build.ts): COMPARE only, never write. A stale committed
 * `createSurface.generated.ts` (full bytes) or a stale TEMPLATES half of
 * `templates.embedded.generated.ts` FAILS loudly, naming the module and
 * `bun run build` as the repair. The manifest's PACKAGE_VERSIONS block is
 * deliberately OUTSIDE the check: a workspace version bump rewrites exactly
 * those lines, no release step rebuilds this package, so a versions-only
 * difference logs a NOTICE and stays green — the block is guarded by write
 * mode and repaired by the next developer `bun run build` (the pre-existing
 * status quo), while a difference touching the TEMPLATES half still fails
 * even when the versions block is stale too.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generators as applicationGenerators } from "@canonical/summon-application";
import { generators as componentGenerators } from "@canonical/summon-component";
import { buildEmbeddedManifest } from "@canonical/summon-core";
import { projectGenerator } from "@canonical/summon-core/projection";
import { generators as packageGenerators } from "@canonical/summon-package";
import { CREATE_GENERATORS } from "../src/capabilities/create/constants.js";

const scriptsUrl = new URL(".", import.meta.url);

/**
 * EVERY declared template root — the binary carries all of them, so every
 * `create` binding runs from the compiled binary. Prefixes and relative dirs
 * come from {@link CREATE_GENERATORS}; the walking, keying (one scheme with
 * the reader), and the per-root/UTF-8 fail-louds are summon-core's
 * `buildEmbeddedManifest` — this module keeps only host duties
 * (write-when-changed + the generated-module header).
 *
 * Each root is the declared package's source templates dir — the source of
 * truth, identical to that package's dist copy — reached through this
 * package's own `node_modules`, which bun links to the sibling workspace
 * directory. That is a MONOREPO BUILD path, not npm resolution: the published
 * tarballs ship `dist` only (`"files": ["dist"]`), so only a checkout
 * satisfies it.
 */
export const TEMPLATE_ROOTS: ReadonlyArray<{ prefix: string; dir: string }> =
  Object.values(CREATE_GENERATORS).flatMap((binding) =>
    binding.templateRoots.map((root) => ({
      prefix: root.prefix,
      dir: fileURLToPath(
        new URL(`../node_modules/${binding.name}/${root.relDir}`, scriptsUrl),
      ),
    })),
  );

const SURFACE_OUT = fileURLToPath(
  new URL("../src/capabilities/create/createSurface.generated.ts", scriptsUrl),
);

/**
 * Project every declared generator binding onto its serializable surface and
 * write `createSurface.generated.ts` — the static data the create surface's
 * params, CLI mount, completion, and MCP schemas all derive from, so the fast
 * path never imports a generator. Deterministic (sorted keys, JSON values);
 * write-only-when-changed. The projection-fidelity test in `create.test.ts`
 * loads the LIVE generators and fails when this file drifts.
 *
 * @param options - `check`: a GATE's build (PRAGMA_BUILD_SKIP_DOCS=1) —
 *   COMPARE only. A changed module means the COMMITTED file is stale, so
 *   fail loudly naming it — never write — leaving the bytes git holds for
 *   the PROTECTED projection-fidelity guard to read. `out`: the module path
 *   (defaults to the committed module; injectable for the seam's unit
 *   cells).
 * @returns The number of projected command paths, and whether the file was
 *   REWRITTEN — the caller's signal that its own `capabilities` import is
 *   now one generation behind and the docs step must re-read the surface
 *   from a fresh process (see build.ts's header).
 */
export function generateCreateSurface({
  check,
  out = SURFACE_OUT,
}: {
  check: boolean;
  out?: string;
}): { surfaced: number; changed: boolean } {
  const maps: Record<string, Record<string, unknown>> = {
    component: componentGenerators as never,
    package: packageGenerators as never,
    application: applicationGenerators as never,
  };
  const entries: Record<string, unknown> = {};
  for (const [kind, binding] of Object.entries(CREATE_GENERATORS)) {
    for (const commandPath of binding.paths) {
      const generator = maps[kind]?.[commandPath];
      if (!generator) {
        throw new Error(
          `no generator exported for declared path ${commandPath}`,
        );
      }
      entries[commandPath] = projectGenerator(
        commandPath.split("/"),
        generator as never,
      );
    }
  }

  const body = Object.keys(entries)
    .sort()
    .map(
      (key) =>
        `  ${JSON.stringify(key)}: ${JSON.stringify(entries[key], null, 2)
          .split("\n")
          .join("\n  ")},`,
    )
    .join("\n");

  const module = `// AUTO-GENERATED by scripts/build.ts — do not edit by hand.
// Regenerate: \`bun run scripts/build.ts\`. The serializable projection of
// every declared generator binding (\`projectGenerator\` over the live
// generators, captured at build time): the create surface's params, the CLI
// mount, completion, and the MCP schemas all derive from THIS data, so the
// \`--help\`/\`__complete\` fast path never imports a generator. The
// projection-fidelity test in create.test.ts loads the LIVE generators and
// fails when this file drifts; rerunning the build fixes it.

import type { SurfaceCommand } from "@canonical/summon-core/projection";

/** Declared command path → its projected command surface. */
export const CREATE_SURFACE: Readonly<Record<string, SurfaceCommand>> = {
${body}
};
`;
  const changed = !existsSync(out) || readFileSync(out, "utf-8") !== module;
  if (changed) {
    if (check) {
      throw new Error(
        "src/capabilities/create/createSurface.generated.ts is STALE — the " +
          "committed projection no longer matches the live generators. Run " +
          "`bun run build` in packages/cli/pragma and commit the result.",
      );
    }
    writeFileSync(out, module);
  }
  return { surfaced: Object.keys(entries).length, changed };
}

const MANIFEST_OUT = fileURLToPath(
  new URL(
    "../src/capabilities/create/templates.embedded.generated.ts",
    scriptsUrl,
  ),
);

/**
 * The manifest module's fixed frame, split at the TEMPLATES/PACKAGE_VERSIONS
 * seam so check mode can judge the two generated bodies SEPARATELY — the
 * assembled module is byte-identical to what one template literal produced
 * before the split (`HEAD + templatesBody + "\n" + MID + versionsBody +
 * "\n" + TAIL`).
 */
const MANIFEST_HEAD = `// AUTO-GENERATED by scripts/build.ts — do not edit by hand.
// Regenerate: \`bun run scripts/build.ts\`. Inlines every declared generator
// root's template tree (component, package, application — all files, not just
// .ejs) as strings, so every \`pragma create\` binding works from the
// standalone --compile binary (the template files are absent from the binary's
// virtual filesystem). Keys follow summon-core's qualified-key scheme.
/** Qualified template key (\`<prefix>/<path>\`) → file contents. */
export const TEMPLATES: Record<string, string> = {
`;
const MANIFEST_MID = `};

/** Declared generator package → version, captured at build time. */
export const PACKAGE_VERSIONS: Record<string, string> = {
`;
const MANIFEST_TAIL = `};
`;

/**
 * Inline every declared root's template tree into the generated manifest
 * module. Deterministic (summon-core sorts the keys; `JSON.stringify` values)
 * so re-running produces byte-identical output — no working-tree churn.
 *
 * @param options - `check`: a GATE's build (PRAGMA_BUILD_SKIP_DOCS=1) —
 *   COMPARE only, never write. The comparison is SPLIT at the module's one
 *   seam: a committed file whose TEMPLATES half (or fixed frame) differs is
 *   stale in the class the PROTECTED reader-derivability guard exists for,
 *   so fail loudly naming the module; a difference confined to the
 *   PACKAGE_VERSIONS block — the expected residue of a workspace version
 *   bump, which no release step rebuilds — logs a NOTICE and stays green
 *   (write mode repairs it on the next developer build). `out`: the module
 *   path (defaults to the committed module; injectable for the seam's unit
 *   cells).
 * @returns The embedded manifest (for counting/reporting).
 */
export function generateTemplateManifest({
  check,
  out = MANIFEST_OUT,
}: {
  check: boolean;
  out?: string;
}): Record<string, string> {
  const entries = buildEmbeddedManifest(TEMPLATE_ROOTS);

  const body = Object.keys(entries)
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(entries[key])},`)
    .join("\n");

  // Each declared generator package's version, captured at build time from
  // the same manifest a source run's disk walk finds. The binary injects it
  // (setEmbeddedPackageVersions) so a generator resolving its OWN version —
  // summon-package's fixed-version-train dependency ranges — gets the value
  // the walk cannot reach under /$bunfs.
  const versions = Object.fromEntries(
    Object.values(CREATE_GENERATORS).map((binding) => {
      const manifestPath = fileURLToPath(
        new URL(`../node_modules/${binding.name}/package.json`, scriptsUrl),
      );
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as {
        version?: string;
      };
      if (!manifest.version) {
        throw new Error(`no version in ${manifestPath}`);
      }
      return [binding.name, manifest.version];
    }),
  );
  const versionsBody = Object.keys(versions)
    .sort()
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(versions[key])},`)
    .join("\n");

  const templatesHalf = `${MANIFEST_HEAD}${body}\n${MANIFEST_MID}`;
  const module = `${templatesHalf}${versionsBody}\n${MANIFEST_TAIL}`;
  // Write only when changed: the output is deterministic, so a rebuild is a
  // no-op — no working-tree churn, and no rewrite racing a concurrent import
  // (the compiled-binary smoke test rebuilds while sibling create tests run).
  const committed = existsSync(out) ? readFileSync(out, "utf-8") : undefined;
  if (committed !== module) {
    if (check) {
      // Judge the halves on the module's own seam (the fixed frame between
      // the two generated bodies), not by regexes over prose: the committed
      // file is versions-only stale exactly when everything up to and
      // including the seam, and the closing frame, are byte-identical to
      // the fresh render — leaving the difference confined to the
      // PACKAGE_VERSIONS body between them.
      const versionsOnly =
        committed !== undefined &&
        committed.length >= templatesHalf.length + MANIFEST_TAIL.length &&
        committed.startsWith(templatesHalf) &&
        committed.endsWith(MANIFEST_TAIL);
      if (!versionsOnly) {
        throw new Error(
          "src/capabilities/create/templates.embedded.generated.ts is STALE " +
            "— the committed TEMPLATES no longer match the declared " +
            "template roots. Run `bun run build` in packages/cli/pragma " +
            "and commit the result.",
        );
      }
      console.log(
        "NOTICE: templates.embedded.generated.ts carries a stale " +
          "PACKAGE_VERSIONS block (expected after a workspace version " +
          "bump) — repaired by the next `bun run build`.",
      );
    } else {
      writeFileSync(out, module);
    }
  }
  return entries;
}
