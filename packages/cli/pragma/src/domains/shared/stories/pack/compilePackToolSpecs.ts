import { resolvePrefixes } from "../../prefixes.js";
import type { ToolSpec } from "../../ToolSpec.js";
import type { PragmaRuntime } from "../../types/index.js";
import compileLookupTool from "../compileLookupTool.js";
import compileReadTool from "../compileReadTool.js";
import collectPackStories from "./collectPackStories.js";
import compilePackStories from "./compilePackStories.js";
import type { ReservedVerbs } from "./reservedVerbs.js";

/**
 * Compile every active story pack into MCP tool specs.
 *
 * Mirrors `compilePackCommands` on the MCP surface: each pack yields
 * `<noun>_list` and, when declared, `<noun>_lookup`, extra `<noun>_<verb>`
 * tools, and `<noun>_sample`, registered alongside the built-in tools.
 *
 * @param runtime - Pragma runtime carrying config, packages, and the store.
 * @param reserved - Built-in `(noun, verb)` reservations packs must not shadow.
 * @returns Tool specs for every pack story.
 */
export default function compilePackToolSpecs(
  runtime: PragmaRuntime,
  reserved: ReservedVerbs,
): ToolSpec[] {
  const prefixes = resolvePrefixes(
    runtime.packages ?? [],
    runtime.config.prefixes,
  );
  const entries = collectPackStories(
    runtime.config,
    runtime.packages ?? [],
    reserved,
  );

  return entries.flatMap((entry) => {
    const compiled = compilePackStories(
      entry.definition,
      entry.source,
      prefixes,
    );
    // Registration order mirrors compilePackCommands: list, lookup,
    // extra verbs, sample. `list` is optional — a pack may serve only the
    // lookup verb of a noun whose list stays built-in.
    const specs: ToolSpec[] = [];
    if (compiled.list) {
      specs.push(compileReadTool(compiled.list));
    }
    if (compiled.lookup) {
      specs.push(compileLookupTool(compiled.lookup));
    }
    for (const verb of compiled.verbs) {
      specs.push(compileReadTool(verb));
    }
    if (compiled.sample) {
      specs.push(compileReadTool(compiled.sample));
    }
    return specs;
  });
}
