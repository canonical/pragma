import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../../context.js";
import { PREFIX_MAP } from "../../prefixes.js";
import compileLookupCommand from "../compileLookupCommand.js";
import compileReadCommand from "../compileReadCommand.js";
import collectPackStories from "./collectPackStories.js";
import compilePackStories from "./compilePackStories.js";

/**
 * Compile every active story pack into CLI command definitions.
 *
 * Story packs come from the merged config (`stories`) and from resolved
 * semantic packages (`stories/*.json`); each yields `<noun> list` and,
 * when declared, `<noun> lookup` — projected through the same kernel as
 * the built-in read stories, so completions and help come for free.
 *
 * @param ctx - Pragma context carrying config, packages, and the store.
 * @param reservedNouns - Built-in nouns packs must not shadow.
 * @returns Command definitions for every pack story.
 */
export default function compilePackCommands(
  ctx: PragmaContext,
  reservedNouns: ReadonlySet<string>,
): CommandDefinition[] {
  const prefixes = { ...PREFIX_MAP, ...ctx.config.prefixes };
  const entries = collectPackStories(ctx.config, ctx.packages, reservedNouns);

  return entries.flatMap((entry) => {
    const compiled = compilePackStories(
      entry.definition,
      entry.source,
      prefixes,
    );
    const commands = [compileReadCommand(ctx, compiled.list)];
    if (compiled.lookup) {
      commands.push(compileLookupCommand(ctx, compiled.lookup));
    }
    return commands;
  });
}
