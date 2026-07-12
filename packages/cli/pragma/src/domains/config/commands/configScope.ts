import type { ParameterDefinition } from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { ConfigScope } from "../../../config/index.js";

/**
 * The `--global` / `--local` target-layer flags shared by every config
 * write command. Without either flag the write follows the global-first
 * rule: nearest existing project file, else the global XDG file.
 */
export const SCOPE_PARAMETERS: readonly ParameterDefinition[] = [
  {
    name: "global",
    description: "Write to the global config (~/.config/pragma/config.json)",
    type: "boolean",
    default: false,
  },
  {
    name: "local",
    description: "Write to ./pragma.config.json in the current directory",
    type: "boolean",
    default: false,
  },
];

/**
 * Resolve the explicit write scope from parsed command parameters.
 *
 * @param params - Parsed command parameters.
 * @returns The explicit scope, or `undefined` for the default rule.
 * @throws PragmaError with code `INVALID_INPUT` when both flags are set.
 */
export function resolveConfigScope(
  params: Record<string, unknown>,
): ConfigScope | undefined {
  const global = params.global === true;
  const local = params.local === true;
  if (global && local) {
    throw PragmaError.invalidInput("scope", "--global --local", {
      recovery: { message: "Pass at most one of --global or --local." },
    });
  }
  if (global) return "global";
  if (local) return "local";
  return undefined;
}
