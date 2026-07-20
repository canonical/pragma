/**
 * Collect the `colophon` payload — the verb's run body (lazily imported).
 *
 * STORELESS: it reads the layered config (memoized) and resolves the EFFECTIVE
 * capability modules exactly as a real command would, so a config story that
 * overrides a bundled pack is reflected here — "active domain" is expressed the
 * way the rest of the CLI expresses it. It never boots the triple store, so the
 * storeless-guarantee spy still sees `store.booted === false`.
 *
 * The registry is reached through a RUNTIME dynamic `import("../index.js")`
 * inside this async body — never a static import — so the static
 * `index → colophonModule → index` cycle can never form. Do NOT "clean it up"
 * into a static import.
 */

import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import { PRAGMA_COLOPHON, PRAGMA_COLOPHON_SUMMARY } from "./pragmaColophon.js";
import type { ColophonData, ColophonSection } from "./types.js";

/**
 * Assemble the colophon data for the current runtime.
 *
 * @param runtime - The per-invocation runtime.
 * @returns The storeless colophon payload: pragma's section, then each active
 *   pack/domain that declares a `colophon`.
 * @note Impure — reads the config layers (never boots the store).
 */
export async function collectColophon(
  runtime: PragmaRuntime,
): Promise<ColophonData> {
  const sections: ColophonSection[] = [
    {
      kind: "pragma",
      title: "pragma",
      markdown: PRAGMA_COLOPHON,
      summary: PRAGMA_COLOPHON_SUMMARY,
      source: "built-in",
    },
  ];

  const { assembleEffectiveModules } = await import(
    "../../kernel/packs/collect.js"
  );
  const { capabilities } = await import("../index.js");

  let modules: readonly CapabilityModule[] = capabilities;
  try {
    const layers = await runtime.loadConfig();
    modules = assembleEffectiveModules(capabilities, layers);
  } catch {
    // A bad config story is surfaced by the real commands; the colophon degrades
    // to the static (bundled) modules rather than failing the narrative.
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
