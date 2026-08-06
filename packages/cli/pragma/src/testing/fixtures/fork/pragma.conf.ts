/**
 * A FORK's distribution config — the acceptance proof of the create surface's
 * despecialization, and the only file this fork edits.
 *
 * It declares ONE generator package, and one this distribution does not ship:
 * `@canonical/summon-monorepo`. Building against it
 * (`bun run scripts/build.ts --fork src/testing/fixtures/fork`) produces a
 * binary whose `create` has a `monorepo` noun the shipped `pragma` has never
 * heard of, and none of the shipped `component`/`package`/`application` nouns —
 * from ONE edited declaration and a rebuild, with no source change anywhere
 * under `src/capabilities/create/`.
 *
 * That asymmetry is the claim being proved. If the create surface were still
 * code, this file could not add a noun; the specifiers `bun build --compile`
 * needs would have to be hand-written next to the ones it replaces.
 *
 * Deliberately MINIMAL: no identity, no packs, no prefixes. A fork that changes
 * only its generators changes only its generators — everything else keeps the
 * kernel's defaults, which is what makes this a test of the create seam alone.
 */

import type { RawConfig } from "../../../kernel/config/types.js";

export default {
  generators: [
    {
      name: "@canonical/summon-monorepo",
      source: "npm:@canonical/summon-monorepo@^0.33.0",
      nouns: {
        monorepo: {
          key: "monorepo",
          summary: "Scaffold a Bun + Lerna monorepo with CI and release flow.",
          useWhen: "Starting a new repository — monorepo shell, CI, release",
          // Both confirms default TRUE upstream, and the CLI grammar has no
          // `--no-` form, so a non-interactive `--yes` run could never turn them
          // off — and both reach outside the scaffold (`git init`, `bun
          // install`). Opting them in is what keeps the proof hermetic.
          optIn: ["initGit", "runInstall"],
          examples: [
            { cmd: "create monorepo --name my-project" },
            {
              cmd: "create monorepo --name my-project --license GPL-3.0",
              note: "a tools/applications monorepo",
            },
          ],
        },
      },
    },
  ],
} satisfies RawConfig;
