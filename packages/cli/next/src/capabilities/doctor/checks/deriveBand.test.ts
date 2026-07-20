/**
 * `deriveBand` — band a doctor check by the harnesses it actually found.
 *
 * Fixtures wrap REAL harness definitions (via `findHarnessById`, no casts), so
 * the scope→band mapping is exercised against the true `scope` fields: the
 * regression this guards is a global-scope harness (Windsurf) being mislabeled
 * PROJECT by a static per-name guess.
 */

import type { DetectedHarness } from "@canonical/harnesses";
import { findHarnessById } from "@canonical/harnesses";
import { describe, expect, it } from "vitest";
import { deriveBand } from "./deriveBand.js";

/** A minimal {@link DetectedHarness} over a real definition (no `as` casts). */
function detect(id: string): DetectedHarness {
  const harness = findHarnessById(id);
  if (!harness) throw new Error(`unknown harness fixture: ${id}`);
  return { harness, confidence: "high", configExists: true, configPath: "x" };
}

describe("deriveBand", () => {
  it("bands a project-scope harness (Cursor) as project", () => {
    expect(deriveBand([detect("cursor")])).toBe("project");
  });

  it("bands a global-scope harness (Windsurf) as global — the fixed mislabel", () => {
    expect(deriveBand([detect("windsurf")])).toBe("global");
  });

  it("bands a dual-scope harness (Claude Code) by its default band (project)", () => {
    expect(deriveBand([detect("claude-code")])).toBe("project");
  });

  it("leaves a set spanning BOTH bands unbanded (general, not mislabeled)", () => {
    expect(deriveBand([detect("cursor"), detect("windsurf")])).toBeUndefined();
  });

  it("leaves an empty set unbanded", () => {
    expect(deriveBand([])).toBeUndefined();
  });
});
