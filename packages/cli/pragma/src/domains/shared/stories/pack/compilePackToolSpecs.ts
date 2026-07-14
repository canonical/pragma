import { PREFIX_MAP } from "../../prefixes.js";
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
 * `<noun>_list` and, when declared, `<noun>_lookup`, registered alongside
 * the built-in tools.
 *
 * @param runtime - Pragma runtime carrying config, packages, and the store.
 * @param reserved - Built-in `(noun, verb)` reservations packs must not shadow.
 * @returns Tool specs for every pack story.
 */
export default function compilePackToolSpecs(
  runtime: PragmaRuntime,
  reserved: ReservedVerbs,
): ToolSpec[] {
  const prefixes = { ...PREFIX_MAP, ...runtime.config.prefixes };
  const entries = collectPackStories(
    runtime.config,
    runtime.packages,
    reserved,
  );

  return entries.flatMap((entry) => {
    const compiled = compilePackStories(
      entry.definition,
      entry.source,
      prefixes,
    );
    const specs = [compileReadTool(compiled.list)];
    if (compiled.lookup) {
      specs.push(compileLookupTool(compiled.lookup));
    }
    return specs;
  });
}
