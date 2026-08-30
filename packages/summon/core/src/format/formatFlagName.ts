import toKebabCase from "../projection/kebab.js";

/**
 * The kebab-case CLI flag form of a camelCase prompt name — a named seam
 * over the projection's {@link toKebabCase}, the SINGLE algorithm every
 * user-facing surface uses. Error messages, `--llm` help, and replay
 * commands must all name the same flag the CLI actually registers
 * (`buildOptionInfo` derives registration from the same function), or an
 * error tells the user to pass a flag that does not exist: a private
 * reimplementation here split on `([a-z])([A-Z])` while registration split
 * on `([a-z0-9])([A-Z])`, so `es2015Style` registered as `--es2015-style`
 * but validation and help said `--es2015style`. Delegating — not copying —
 * is what keeps the two surfaces from disagreeing again.
 */
export default function formatFlagName(promptName: string): string {
  return toKebabCase(promptName);
}
