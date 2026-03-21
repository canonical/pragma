/**
 * Individual environment health checks for `pragma doctor`.
 *
 * Each function takes a CheckContext and returns a CheckResult.
 * Grouped here since they are small, tightly related, and share the
 * same shape.
 *
 * @note Impure — reads filesystem, spawns processes, boots store.
 * @see IN.07 in B.11.INSTALL
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DetectedHarness } from "@canonical/harnesses";
import { detectHarnesses, readMcpConfig } from "@canonical/harnesses";
import { runTask } from "@canonical/task";
import configExists from "../../../configExists.js";
import { VERSION } from "../../../constants.js";
import {
  PM_COMMANDS,
  detectLocalInstall,
  detectPackageManager,
} from "../../../pm.js";
import { collectStoreSummary } from "../../info/collectStoreSummary.js";
import { bootStore } from "../../shared/bootStore.js";
import type { CheckContext, CheckResult } from "./types.js";

const MIN_NODE_MAJOR = 20;

/**
 * Check that Node.js version meets the minimum requirement.
 */
export async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.versions.node;
  const major = Number.parseInt(version.split(".")[0] ?? "0", 10);

  if (major >= MIN_NODE_MAJOR) {
    return { name: "Node version", status: "pass", detail: `v${version}` };
  }

  return {
    name: "Node version",
    status: "fail",
    detail: `v${version} (requires >= ${MIN_NODE_MAJOR})`,
    remedy: `Install Node.js >= ${MIN_NODE_MAJOR}`,
  };
}

/**
 * Report pragma version, install method, and global/local status.
 * Always passes — informational.
 */
export async function checkPragmaVersion(): Promise<CheckResult> {
  const pm = detectPackageManager();
  const localWarning = detectLocalInstall();
  const scope = localWarning ? "local" : "global";

  return {
    name: "pragma version",
    status: "pass",
    detail: `v${VERSION} (installed via ${pm}, ${scope})`,
  };
}

/**
 * Check that pragma.config.toml exists in the working directory.
 */
export async function checkConfigFile(ctx: CheckContext): Promise<CheckResult> {
  if (configExists(ctx.cwd)) {
    return {
      name: "pragma.config.toml",
      status: "pass",
      detail: "found",
    };
  }

  return {
    name: "pragma.config.toml",
    status: "fail",
    detail: "not found",
    remedy: "pragma config tier <tier>",
  };
}

/**
 * Check that the ke store boots successfully, reporting triple count and
 * boot time.
 */
export async function checkKeStore(ctx: CheckContext): Promise<CheckResult> {
  const start = performance.now();
  let store: Awaited<ReturnType<typeof bootStore>> | undefined;
  try {
    store = await bootStore({ cwd: ctx.cwd });
    const summary = await collectStoreSummary(store);
    const elapsed = Math.round(performance.now() - start);
    return {
      name: "ke store",
      status: "pass",
      detail: `${summary.tripleCount.toLocaleString()} triples in ${elapsed}ms`,
    };
  } catch {
    return {
      name: "ke store",
      status: "fail",
      detail: "failed to boot",
      remedy:
        "Ensure design system packages are installed: bun add -D @canonical/ds-global @canonical/code-standards",
    };
  } finally {
    store?.dispose();
  }
}

/**
 * Check whether shell completions are sourced in the user's shell RC file.
 */
export async function checkShellCompletions(): Promise<CheckResult> {
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

/**
 * Check that terrazzo-lsp is installed, but only if tokens.config.mjs exists
 * in the working directory. Skipped otherwise.
 */
export async function checkTerrazzo(ctx: CheckContext): Promise<CheckResult> {
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

/**
 * Check that at least one AI harness has pragma configured as an MCP server.
 */
export async function checkMcpConfigured(
  ctx: CheckContext,
): Promise<CheckResult> {
  let detected: DetectedHarness[];
  try {
    detected = await runTask(detectHarnesses(ctx.cwd));
  } catch {
    return {
      name: "MCP configured",
      status: "fail",
      detail: "harness detection failed",
      remedy: "pragma setup mcp",
    };
  }

  if (detected.length === 0) {
    return {
      name: "MCP configured",
      status: "fail",
      detail: "no AI harnesses detected",
      remedy: "pragma setup mcp",
    };
  }

  const configured: string[] = [];
  for (const d of detected) {
    if (!d.configExists) continue;
    try {
      const servers = await runTask(readMcpConfig(d.harness, ctx.cwd));
      if ("pragma" in servers) {
        configured.push(d.harness.name);
      }
    } catch {
      // Config unreadable — skip
    }
  }

  if (configured.length > 0) {
    return {
      name: "MCP configured",
      status: "pass",
      detail: configured.join(", "),
    };
  }

  const names = detected.map((d) => d.harness.name).join(", ");
  return {
    name: "MCP configured",
    status: "fail",
    detail: `detected ${names} but pragma not configured`,
    remedy: "pragma setup mcp",
  };
}

/**
 * Check that skills are symlinked for detected harnesses.
 */
export async function checkSkillsSymlinked(
  ctx: CheckContext,
): Promise<CheckResult> {
  let detected: DetectedHarness[];
  try {
    detected = await runTask(detectHarnesses(ctx.cwd));
  } catch {
    return {
      name: "Skills symlinked",
      status: "fail",
      detail: "harness detection failed",
      remedy: "pragma setup skills",
    };
  }

  if (detected.length === 0) {
    return {
      name: "Skills symlinked",
      status: "skip",
      detail: "no AI harnesses detected",
    };
  }

  const linked: string[] = [];
  const missing: string[] = [];

  for (const d of detected) {
    const skillsPath = d.harness.skillsPath(ctx.cwd);
    if (existsSync(skillsPath)) {
      linked.push(d.harness.name);
    } else {
      missing.push(d.harness.name);
    }
  }

  if (missing.length === 0) {
    return {
      name: "Skills symlinked",
      status: "pass",
      detail: linked.join(", "),
    };
  }

  return {
    name: "Skills symlinked",
    status: "fail",
    detail: `missing for ${missing.join(", ")}`,
    remedy: "pragma setup skills",
  };
}
