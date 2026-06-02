import { type Framework, VALID_FRAMEWORKS } from "#constants";
import { PragmaError } from "#error";

/**
 * Validate that a string is one of the accepted framework values.
 *
 * @param value - The framework string to validate.
 * @returns The validated Framework value.
 * @throws PragmaError.invalidInput if the value is not a valid framework.
 */
export default function validateFramework(value: string): Framework {
  if (VALID_FRAMEWORKS.includes(value as Framework)) {
    return value as Framework;
  }

  throw PragmaError.invalidInput("framework", value, {
    validOptions: [...VALID_FRAMEWORKS],
    recovery: {
      message: "Reset framework configuration.",
      cli: "pragma config framework --reset",
      mcp: { tool: "config_framework", params: { reset: true } },
    },
  });
}
