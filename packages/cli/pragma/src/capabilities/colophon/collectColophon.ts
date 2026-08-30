/**
 * Collect the `colophon` payload — the verb's run body (lazily imported).
 *
 * STORELESS: it resolves the EFFECTIVE capability modules exactly as a real
 * command would — through `loadEffectiveModules`, so a story declared by a
 * PACKAGE the active pack carries surfaces its colophon here too, not only a
 * config-declared one. It never boots the triple store, so the
 * storeless-guarantee spy still sees `store.booted === false`. The static
 * import of the validated distribution config (`config/defaults.js`) is safe
 * here because this module sits behind the verb's dynamic `import()` — it
 * never lands on the `--help`/`__complete` fast path.
 *
 * The registry is reached through a RUNTIME dynamic `import("../index.js")`
 * inside this async body — never a static import — so the static
 * `index → colophonModule → index` cycle can never form. Do NOT "clean it up"
 * into a static import.
 */

import { BIN_NAME } from "../../constants.js";
import distribution from "../../kernel/config/defaults.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { CapabilityModule } from "../../kernel/spec/types.js";
import type { ColophonData, ColophonSection } from "./types.js";

/**
 * Assemble the colophon data for the current runtime.
 *
 * The toolchain section is DECLARED, not authored here: the distribution
 * config's `colophon` field carries the narrative (and its condensed summary),
 * and this collector renders whatever it declares under the distribution's own
 * name — a fork edits its config, never this module. A distribution declaring
 * no `colophon` gets no toolchain section: the packs' domain colophons stand
 * alone. The `kind: "pragma"` value is a frozen JSON discriminant (wire
 * compatibility), not the distribution's name.
 *
 * @param runtime - The per-invocation runtime.
 * @returns The storeless colophon payload: the distribution's declared section,
 *   then each active pack/domain that declares a `colophon`.
 * @note Impure — reads the config layers (never boots the store).
 */
export async function collectColophon(
  runtime: PragmaRuntime,
): Promise<ColophonData> {
  const sections: ColophonSection[] = [];
  if (distribution.colophon) {
    sections.push({
      kind: "pragma",
      title: BIN_NAME,
      markdown: distribution.colophon.markdown,
      ...(distribution.colophon.summary === undefined
        ? {}
        : { summary: distribution.colophon.summary }),
      source: "built-in",
    });
  }

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
