import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../context.js";
import { resolvePrefixes } from "../../prefixes.js";
import compileLookupCommand from "../compileLookupCommand.js";
import compileReadCommand from "../compileReadCommand.js";
import collectPackStories from "./collectPackStories.js";
import compilePackStories from "./compilePackStories.js";
import type { ReservedVerbs } from "./reservedVerbs.js";

/**
 * Compile every active story pack into CLI command definitions.
 *
 * Story packs come from the merged config (`stories`) and from resolved
 * semantic packages (`stories/*.json`); each yields `<noun> list` and,
 * when declared, `<noun> lookup`, extra list verbs, and `<noun> sample` —
 * projected through the same kernel as the built-in read stories, so
 * completions and help come for free.
 *
 * @param ctx - Pragma context carrying config, packages, and the store.
 * @param reserved - Built-in `(noun, verb)` reservations packs must not shadow.
 * @returns Command definitions for every pack story.
 */
export default function compilePackCommands(
  ctx: PragmaContext,
  reserved: ReservedVerbs,
): CommandDefinition[] {
  const prefixes = resolvePrefixes(ctx.packages ?? [], ctx.config.prefixes);
  const entries = collectPackStories(ctx.config, ctx.packages ?? [], reserved);

  return entries.flatMap((entry) => {
    const compiled = compilePackStories(
      entry.definition,
      entry.source,
      prefixes,
    );
    // Surface order mirrors the built-in leaf domains: list, lookup,
    // extra verbs, sample. `list` is optional — a pack may serve only the
    // lookup verb of a noun whose list stays built-in.
    const commands: CommandDefinition[] = [];
    if (compiled.list) {
      commands.push(compileReadCommand(ctx, compiled.list));
    }
    if (compiled.lookup) {
      commands.push(compileLookupCommand(ctx, compiled.lookup));
    }
    for (const verb of compiled.verbs) {
      commands.push(compileReadCommand(ctx, verb));
    }
    if (compiled.sample) {
      commands.push(compileReadCommand(ctx, compiled.sample));
    }
    return commands;
  });
}
