/**
 * Collect the `colophon` payload — the verb's run body (lazily imported).
 *
 * The leading section is the DISTRIBUTION's own, read from `pragma.conf.ts`
 * through `constants.DISTRIBUTION_COLOPHON`. It used to be a narrative
 * hardcoded in a sibling module, which is why `kernel/copy.test.ts` carried an
 * exemption for that one file; the narrative is content now and the exemption
 * is gone.
 *
 * STORELESS: it resolves the EFFECTIVE capability modules exactly as a real
 * command would — through `loadEffectiveModules`, so a story declared by a
 * PACKAGE the active pack carries surfaces its colophon here too, not only a
 * config-declared one. It never boots the triple store, so the
 * storeless-guarantee spy still sees `store.booted === false`.
 *
 * The registry is reached through a RUNTIME dynamic `import("../index.js")`
 * inside this async body — never a static import — so the static
 * `index → colophonModule → index` cycle can never form. Do NOT "clean it up"
 * into a static import.
 */

import { BIN_NAME, DISTRIBUTION_COLOPHON } from "../../constants.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import type { ColophonData, ColophonSection } from "./types.js";

/**
 * Assemble the colophon data for the current runtime.
 *
 * @param runtime - The per-invocation runtime.
 * @returns The storeless colophon payload: the distribution's own section (when
 *   it declares one), then each active pack/domain that declares a `colophon`.
 * @note Impure — reads the config layers (never boots the store).
 */
export async function collectColophon(
  runtime: PragmaRuntime,
): Promise<ColophonData> {
  // The leading section is DECLARED, not authored here: title from the
  // distribution's own name, body from its `colophon`. It is OMITTED entirely
  // when none is declared — the field is optional, and a distribution that
  // declares no story about itself must still get its packs' sections rather
  // than an empty heading or a crash.
  const sections: ColophonSection[] = DISTRIBUTION_COLOPHON
    ? [
        {
          kind: "distribution",
          title: BIN_NAME,
          markdown: DISTRIBUTION_COLOPHON.markdown,
          ...(DISTRIBUTION_COLOPHON.summary
            ? { summary: DISTRIBUTION_COLOPHON.summary }
            : {}),
          source: "built-in",
        },
      ]
    : [];

  const { loadEffectiveModules } = await import(
    "../../kernel/packs/collect.js"
  );
  const { capabilities } = await import("../index.js");

  let modules: readonly CapabilityModule[] = capabilities;
  try {
    modules = (await loadEffectiveModules(capabilities, runtime.cwd)).modules;
  } catch {
    // A bad config story is surfaced by the real commands; the colophon degrades
    // to the static modules rather than failing the narrative. (A bad PACKAGE
    // story never throws — it is dropped and reported by doctor.)
  }

  for (const module of modules) {
    if (module.colophon) {
      sections.push({
        kind: "pack",
        title: module.name,
        markdown: module.colophon,
        source: `pack:${module.name}`,
      });
    }
  }

  return { sections };
}
