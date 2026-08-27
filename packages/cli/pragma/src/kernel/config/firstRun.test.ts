/**
 * The setup hint — the read-only replacement for first-run seeding.
 *
 * Onboarding used to WRITE: a pipeline step ran before dispatch on every
 * non-help invocation and created the global config, so `skill list` — a read —
 * mutated the machine before the user had consented to anything. Seeding is now
 * the `config` setup target, created inside a consented run. What is left is a
 * stateless hint, and the property that matters most about it is the one these
 * tests pin: reading it writes nothing.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { setupHintLines } from "./firstRun.js";
import { globalConfigPath } from "./paths.js";

const originalConfigHome = process.env.XDG_CONFIG_HOME;

function freshConfigHome(): string {
  const dir = mkdtempSync(join(tmpdir(), "pragma-first-"));
  process.env.XDG_CONFIG_HOME = dir;
  return dir;
}

afterEach(() => {
  process.env.XDG_CONFIG_HOME = originalConfigHome;
});

describe("the setup hint", () => {
  it("names the pre-release and the command that configures the machine", () => {
    freshConfigHome();
    const lines = setupHintLines();
    expect(lines.some((line) => line.includes("pre-release"))).toBe(true);
    expect(lines.some((line) => line.includes("pragma setup"))).toBe(true);
  });

  it("writes NOTHING — presence of the config is the state, not a marker", () => {
    // A marker file would itself be a pre-consent write, which is the exact
    // defect being removed. The probe must leave the config home untouched.
    const dir = freshConfigHome();
    expect(existsSync(globalConfigPath())).toBe(false);

    setupHintLines();
    setupHintLines();

    expect(readdirSync(dir)).toEqual([]);
    expect(existsSync(globalConfigPath())).toBe(false);
  });

  it("goes quiet once the config exists", () => {
    freshConfigHome();
    const path = globalConfigPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "{}\n");

    expect(setupHintLines()).toEqual([]);
  });
});
