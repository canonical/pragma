import { PragmaError } from "#error";

/**
 * Shape a disclosure level name must have: a lowercase token.
 *
 * Levels are pack-defined names (conventionally `summary`, `digest`,
 * `detailed`), so the set is open — validation only rejects values that
 * can never be a level name. A configured level unknown to a given noun
 * is simply ignored for that noun (see `resolveDetailLevel`).
 */
const DETAIL_TOKEN = /^[a-z][a-z0-9-]*$/;

/**
 * Validate that a string is a plausible disclosure level name.
 *
 * @param value - The detail level string to validate.
 * @returns The validated level name.
 * @throws PragmaError.invalidInput if the value is not a lowercase token.
 */
export default function validateDetail(value: string): string {
  if (DETAIL_TOKEN.test(value)) {
    return value;
  }

  throw PragmaError.invalidInput("detail", value, {
    recovery: {
      message:
        "Pass a lowercase level name declared by a pack (e.g. summary, digest, detailed).",
      cli: "pragma config detail --reset",
      mcp: { tool: "config_detail", params: { reset: true } },
    },
  });
}
