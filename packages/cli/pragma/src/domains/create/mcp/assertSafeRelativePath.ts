import { isAbsolute } from "node:path";
import { PragmaError } from "#error";

/**
 * Reject an agent-supplied path or name that could write outside the project.
 *
 * The MCP `create_*` tools run on untrusted agent input and hand it to a
 * generator that builds file paths from it. A value that is an absolute path,
 * or that contains a `..` segment, would resolve to a location outside the
 * working directory — so it is refused before it can reach any file write. No
 * legitimate component path or package name needs either.
 *
 * @param field - The parameter name, used in the error message.
 * @param value - The agent-supplied path or name.
 * @throws PragmaError When the value is absolute or contains a `..` segment.
 */
export default function assertSafeRelativePath(
  field: string,
  value: string,
): void {
  const segments = value.split(/[/\\]/);
  if (isAbsolute(value) || segments.includes("..")) {
    throw PragmaError.invalidInput(field, value);
  }
}
