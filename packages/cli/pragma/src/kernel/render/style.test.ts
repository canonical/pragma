/**
 * The color gate.
 *
 * `forbidsColor` is tested directly because it encodes a convention with two
 * counter-intuitive edges — an empty assignment does NOT disable, and any
 * non-empty value DOES, including `0`. The zero-escape guarantee is asserted
 * against the shared chalk instance, which is what the four modules that bypass
 * `RenderStyle` actually reach for.
 */

import chalk from "chalk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { forbidsColor, styleFor } from "./style.js";

/** The ANSI escape introducer, written as an escape so no control byte
 * sits in the source. Assertions read "does not contain this". */
const ANSI_ESCAPE = "\u001B[";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("forbidsColor", () => {
  it("disables for any non-empty value, whatever it says", () => {
    expect(forbidsColor({ NO_COLOR: "1" })).toBe(true);
    // Counter-intuitive and deliberate: the value is never parsed.
    expect(forbidsColor({ NO_COLOR: "0" })).toBe(true);
    expect(forbidsColor({ NO_COLOR: "false" })).toBe(true);
  });

  it("does NOT disable for an absent or empty variable", () => {
    expect(forbidsColor({})).toBe(false);
    expect(forbidsColor({ NO_COLOR: "" })).toBe(false);
  });
});

describe("the plain style emits no escapes (PROTECTED)", () => {
  it("returns its input untouched for every role", () => {
    const plain = styleFor(false);
    // `enabled` rides alongside the roles, so select the callables rather than
    // assuming the shape — a role added later is then covered automatically.
    const roles = Object.values(plain).filter(
      (value): value is (text: string) => string => typeof value === "function",
    );
    expect(roles.length).toBeGreaterThan(0);
    for (const role of roles) {
      expect(role("text")).toBe("text");
      expect(role("text")).not.toContain(ANSI_ESCAPE);
    }
  });
});

describe("NO_COLOR reaches the shared chalk instance (PROTECTED)", () => {
  // The defect this pins: the gate delegated to chalk, and the vendored
  // `supports-color` it ships has no NO_COLOR branch at all — so the flag did
  // nothing while the code asserted it worked. Re-importing under a stubbed env
  // exercises the module-load check that now zeroes the level.
  it("zeroes chalk's level, so even direct chalk callers go plain", async () => {
    const level = chalk.level;
    try {
      // FORCE a color-capable level first. Under vitest there is no TTY, so
      // chalk already reports 0 and the assertion below would hold whether or
      // not the module does anything — the test would pass with the fix
      // deleted, which is no test at all. Starting from 3 makes the zeroing the
      // only thing that can satisfy it.
      chalk.level = 3;
      expect(chalk.cyan("text")).toContain(ANSI_ESCAPE);

      vi.stubEnv("NO_COLOR", "1");
      vi.resetModules();
      await import("./style.js");

      expect(chalk.level).toBe(0);
      // The four modules that bypass RenderStyle call chalk exactly like this.
      expect(chalk.cyan("text")).toBe("text");
      expect(chalk.bold("text")).not.toContain(ANSI_ESCAPE);
    } finally {
      chalk.level = level;
      vi.resetModules();
    }
  });
});
