import { isAbsolute } from "node:path";

/**
 * Throw an `Error` tagged with `code === "UNSAFE_PATH"`, so a front-end can
 * present it as invalid input rather than an internal fault. The literal is a
 * cross-package contract (mirroring Node's `err.code`); consumers match the
 * string rather than importing a symbol.
 */
const rejectPath = (message: string): never => {
  const error = new Error(message);
  (error as { code?: string }).code = "UNSAFE_PATH";
  throw error;
};

/**
 * Assert that a candidate path stays within the working directory, throwing if
 * it does not. A generator derives filesystem targets (a component directory, a
 * package directory) from CLI- or agent-supplied strings; without this guard a
 * value like `../../etc/Button` or an absolute `/etc` would let the generator
 * write outside its intended root. Call it on the *derived* path (e.g. the
 * scope-stripped package directory), since derivation can itself produce an
 * absolute path from a crafted input such as `@scope//etc`.
 *
 * Rejects, cross-platform:
 * - a non-string or empty value;
 * - an absolute path, a leading `/` or `\`, or a `C:`-style drive prefix;
 * - any `..` segment (splitting on both `/` and `\`, so a Windows-style
 *   traversal is caught even on POSIX where `\` is a valid filename byte).
 *
 * Thrown errors carry `code === "UNSAFE_PATH"`.
 *
 * @param candidate - The path to validate.
 * @param label - Name of the originating input, used in the thrown message.
 * @throws If `candidate` is empty, absolute, or escapes upward.
 */
export default function assertSafeRelativePath(
  candidate: string,
  label: string,
): void {
  if (typeof candidate !== "string" || candidate.length === 0) {
    rejectPath(`${label} must be a non-empty path.`);
  }
  if (
    isAbsolute(candidate) ||
    /^[/\\]/.test(candidate) ||
    /^[a-zA-Z]:/.test(candidate)
  ) {
    rejectPath(
      `${label} must be a relative path, not an absolute path: "${candidate}".`,
    );
  }
  if (candidate.split(/[/\\]/).includes("..")) {
    rejectPath(
      `${label} must not escape the working directory with "..": "${candidate}".`,
    );
  }
}
