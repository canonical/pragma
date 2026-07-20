import { existsSync } from "node:fs";
import type { DetectedHarness } from "@canonical/harnesses";
import { detectHarnesses } from "@canonical/harnesses";
import { runTask } from "@canonical/task/node";
import type { CheckResult } from "../types.js";

/**
 * Check that a skills directory exists for each detected AI harness. Skipped
 * when no harnesses are detected.
 *
 * @param cwd - The project root to detect harnesses against.
 * @returns A CheckResult indicating pass, fail (with a remedy), or skip.
 * @note Impure — detects harnesses and probes the filesystem.
 */
export async function checkSkillsSymlinked(cwd: string): Promise<CheckResult> {
  let detected: DetectedHarness[];
  try {
    detected = await runTask(detectHarnesses(cwd));
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
    if (existsSync(d.harness.skillsPath(cwd))) {
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
