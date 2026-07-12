import type { CommandContext } from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../context.js";

/**
 * Narrow a cli-core `CommandContext` to the pragma context.
 *
 * Story completion callbacks receive the cli-core context type, but every
 * context the pragma pipeline constructs is a `PragmaContext` (it carries
 * the ke store and config). This asserts that invariant at runtime instead
 * of casting silently, failing fast if a foreign context ever appears.
 */
export default function requirePragmaContext(
  ctx: CommandContext,
): PragmaContext {
  if (!("store" in ctx)) {
    throw PragmaError.internalError(
      "completion context is missing the pragma runtime",
    );
  }
  // Proven one line up: a context carrying `store` is a PragmaContext.
  return ctx as PragmaContext;
}
