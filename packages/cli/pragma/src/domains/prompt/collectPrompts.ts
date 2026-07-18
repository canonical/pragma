/**
 * Assemble the prompt registry for a runtime.
 *
 * Mirrors `collectPackStories`: authored sources are validated with
 * skip-with-warn semantics (one bad prompt cannot break boot — or kill
 * tab-completion), duplicate names resolve first-wins with a stderr
 * warning, and skill stubs (D4) append last, suppressed by any authored
 * prompt of the same name.
 *
 * Sources today: the bundled transitional catalog (D6). When the v2 pack
 * loader lands, config- and package-declared `kind: "prompt"` documents
 * slot in ABOVE bundled (config > package > bundled) without touching
 * anything downstream — they emit the same `PromptDefinition`.
 */

import type { ToolSpec } from "../shared/ToolSpec.js";
import type { PragmaRuntime } from "../shared/types/index.js";
import { BUNDLED_PROMPTS } from "./bundled/index.js";
import projectSkillStubs from "./operations/projectSkillStubs.js";
import type { PromptDefinition, PromptRegistryEntry } from "./types.js";
import validatePromptDefinition from "./validatePromptDefinition.js";

/**
 * Collect the validated prompt registry.
 *
 * @param runtime - Runtime slice for config, cwd (skill discovery).
 * @param toolSpecs - The SAME tool production the server registers —
 *   embed validation runs against it.
 * @param bundled - Bundled prompt documents. Tests pass `[]` to isolate.
 * @returns Registry entries in listing order (authored, then stubs).
 * @note Impure — discovers skills on disk; warns on stderr for skipped
 *   documents. Never writes to stdout (MCP stdio safety).
 */
export default async function collectPrompts(
  runtime: Pick<PragmaRuntime, "config" | "cwd" | "packages">,
  toolSpecs: readonly ToolSpec[],
  bundled: readonly unknown[] = BUNDLED_PROMPTS,
): Promise<PromptRegistryEntry[]> {
  const entries: PromptRegistryEntry[] = [];
  const taken = new Set<string>();

  for (const raw of bundled) {
    let definition: PromptDefinition;
    const declaredName =
      typeof raw === "object" && raw !== null && "name" in raw
        ? String((raw as { name: unknown }).name)
        : "(unnamed)";
    const source = `bundled:${declaredName}`;
    try {
      definition = validatePromptDefinition(raw, source, toolSpecs);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Warning: skipping prompt — ${reason}\n`);
      continue;
    }
    if (taken.has(definition.name)) {
      process.stderr.write(
        `Warning: skipping prompt "${definition.name}" from ${source} — the name is already provided by a higher-precedence source.\n`,
      );
      continue;
    }
    taken.add(definition.name);
    entries.push({ definition, source });
  }

  // D4 skill stubs — appended last; authored prompts suppress by name.
  entries.push(...(await projectSkillStubs(runtime, taken)));

  return entries;
}
