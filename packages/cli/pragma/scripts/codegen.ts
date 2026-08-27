/**
 * The committed-codegen generator the build runs (`scripts/build.ts` is
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
 * in build.ts): COMPARE, never silently repair. A stale committed
 * `createSurface.generated.ts` FAILS loudly, naming the module and
 * `bun run build` as the repair. The gate must judge the bytes git actually
 * holds, so repairing them in the same run that checks them would green a
 * stale tree and hide the drift the guard exists to surface.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { generators as applicationGenerators } from "@canonical/summon-application";
import { generators as componentGenerators } from "@canonical/summon-component";
import { projectGenerator } from "@canonical/summon-core/projection";
import { generators as packageGenerators } from "@canonical/summon-package";
import { CREATE_GENERATORS } from "../src/capabilities/create/constants.js";

const scriptsUrl = new URL(".", import.meta.url);

/**
 * Whether an environment makes `scripts/build.ts` a GATE's build — CHECK
 * mode for the generator below, docs skipped. ONE reader for the one
 * flag: build.ts consumes this over its own `process.env`, and the seam
 * cells in src/testing/perf/codegen.test.ts drive it together with the
 * gate spawn's exported env (GATE_BUILD_ENV in perf/globalSetup.ts), so
 * the flag's VALUE and its READER cannot drift apart unnoticed. The two
 * CALL SITES either half hangs off — the spawn's spread, and build.ts's
 * `checkModeFromEnv(process.env)` — remain pinned by CONSTRUCTION only
 * (no test executes scripts/build.ts), so severing one still reverts gate
 * builds to write mode silently, which is exactly how the loop's
 * silent-repair MAJORs would come back.
 *
 * @param env - The environment to judge (build.ts passes `process.env`;
 *   injectable for the cells).
 * @returns True exactly when PRAGMA_BUILD_SKIP_DOCS is the string "1".
 */
export function checkModeFromEnv(
  env: Record<string, string | undefined>,
): boolean {
  return env.PRAGMA_BUILD_SKIP_DOCS === "1";
}

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
