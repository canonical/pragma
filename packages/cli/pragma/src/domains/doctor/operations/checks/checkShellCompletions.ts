import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { CheckResult } from "../types.js";

/**
 * Check whether "pragma" appears in any of the user's shell RC files
 * (`.bashrc`, `.zshrc`, `config.fish`), indicating completions are installed.
 *
 * @returns A CheckResult indicating pass (installed) or fail with remedy.
 * @note Impure
 */
export default async function checkShellCompletions(): Promise<CheckResult> {
  const home = homedir();
  const rcFiles = [
    join(home, ".bashrc"),
    join(home, ".zshrc"),
    join(home, ".config", "fish", "config.fish"),
  ];

  for (const rcFile of rcFiles) {
    try {
      const content = readFileSync(rcFile, "utf-8");
      if (content.includes("pragma")) {
        return {
          name: "Shell completions",
          status: "pass",
          detail: "installed",
        };
      }
    } catch {
      // File doesn't exist — continue
    }
  }

  return {
    name: "Shell completions",
    status: "fail",
    detail: "not installed",
    remedy: "pragma setup completions",
  };
}
