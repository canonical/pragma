import { existsSync } from "node:fs";
import { join } from "node:path";
import { detectPackageManager, PM_COMMANDS } from "#package-manager";
import type { CheckContext, CheckResult } from "../types.js";

/**
 * Check that `terrazzo-lsp` is installed. Skipped when no
 * `tokens.config.mjs` exists in the working directory.
 *
 * @param ctx - Check context with the working directory.
 * @returns A CheckResult indicating pass, fail, or skip.
 * @note Impure
 */
export default async function checkTerrazzo(
  ctx: CheckContext,
): Promise<CheckResult> {
  const configFile = join(ctx.cwd, "tokens.config.mjs");
  if (!existsSync(configFile)) {
    return {
      name: "terrazzo-lsp",
      status: "skip",
      detail: "no tokens.config.mjs found",
    };
  }

  try {
    const { execSync } = await import("node:child_process");
    execSync("which terrazzo-lsp", { stdio: "ignore" });
    return {
      name: "terrazzo-lsp",
      status: "pass",
      detail: "installed",
    };
  } catch {
    return {
      name: "terrazzo-lsp",
      status: "fail",
      detail: "not found",
      remedy: PM_COMMANDS[detectPackageManager()].install("@terrazzo/lsp"),
    };
  }
}
