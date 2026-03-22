import type { CommandDefinition } from "@canonical/cli-core";
import type { PragmaContext } from "../shared/context.js";
import { listCommand, lookupCommand } from "./commands/index.js";

export function commands(ctx: PragmaContext): CommandDefinition[] {
  return [listCommand(ctx), lookupCommand(ctx)];
}

export { listModifiers, lookupModifier } from "./operations/index.js";
