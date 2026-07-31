import type { Diagnostic } from "../shared/index.js";

/**
 * Thrown when a compile produces any error-severity diagnostic (or composition
 * yields no schema) — carries the full diagnostic list of the compilation, not
 * just the fatal ones, so the consumer can report everything at once.
 */
export default class CompilationError extends Error {
  readonly diagnostics: Diagnostic[];

  constructor(diagnostics: Diagnostic[]) {
    const errors = diagnostics.filter((d) => d.severity === "error");
    super(
      `ke-graphql: compilation failed with ${errors.length} error(s):\n${errors
        .map((d) => `  ${d.code}: ${d.message}`)
        .join("\n")}`,
    );
    this.name = "CompilationError";
    this.diagnostics = diagnostics;
  }
}
