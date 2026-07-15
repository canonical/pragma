import {
  type CommandDefinition,
  generatorToCommand,
} from "@canonical/cli-core";
import { generators as applicationGenerators } from "@canonical/summon-application";
import type { AnyGenerator } from "@canonical/summon-core";
import { assertApplicationFlags } from "../applicationFlags.js";
import renderGeneratorUi from "../renderGeneratorUi.js";

/**
 * Build the `pragma create application` command definition.
 *
 * Wraps summon's `application/react` generator — the same pattern as
 * {@link buildPackageCommand}: `generatorToCommand` projects the generator's
 * prompts into CLI parameters and help, then execute is swapped for
 * {@link renderGeneratorUi} so an interactive run gets summon's rich Ink UI
 * while batch/machine modes keep the UI-free path.
 *
 * @returns The command definition for `pragma create application`.
 * @throws Error if the application generator is not found.
 * @note Impure
 */
export default function buildApplicationCommand(): CommandDefinition {
  // summon-application declares `generators` with `satisfies`, preserving each
  // generator's narrow answer type; the command wrappers accept the erased
  // `AnyGenerator`, so widen here (as the package command / MCP spec do).
  const gen = applicationGenerators["application/react"] as
    | AnyGenerator
    | undefined;
  if (!gen) {
    throw new Error(
      "Application generator not found in @canonical/summon-application",
    );
  }
  const command = generatorToCommand(["create", "application"], gen);
  return {
    ...command,
    execute: async (params, ctx) => {
      // Map the generator's hard ssr/router requirement to typed INVALID_INPUT
      // before it throws a plain Error (which would surface as INTERNAL_ERROR).
      assertApplicationFlags(params);
      return renderGeneratorUi(gen, params, ctx);
    },
  };
}
