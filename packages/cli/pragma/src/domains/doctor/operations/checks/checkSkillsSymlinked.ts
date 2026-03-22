/**
 * Check that skills are symlinked for detected harnesses.
 * @note Impure — reads filesystem, detects harnesses.
 */

import { existsSync } from "node:fs";
import type { DetectedHarness } from "@canonical/harnesses";
import { detectHarnesses } from "@canonical/harnesses";
import { runTask } from "@canonical/task";
import type { CheckContext, CheckResult } from "../types.js";

export default async function checkSkillsSymlinked(
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
