/**
 * Render golden for `pragma doctor` — the plain-path color gate (F1).
 *
 * The plain formatter tints ONLY on a color-capable TTY. `supports-color` reports
 * a non-zero `chalk.level` off a TTY under `GITHUB_ACTIONS` / `FORCE_COLOR`, so
 * gating on the level alone bled ANSI into `doctor --format plain | tee`; the
 * `isTTY` gate (via the shared style seam) closes that leak. Proven both ways:
 * zero ANSI off a TTY even at a high chalk level, and tinted on an attended TTY.
 */

import chalk from "chalk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { doctorFormatters } from "./doctor.render.js";
import type { DoctorData } from "./types.js";

/** A fixture spanning pass/fail/skip, sub-items, and a remedy — every color path. */
const DATA: DoctorData = {
  checks: [
    { name: "Node version", status: "pass", detail: "v24" },
    {
      name: "package refs",
      status: "fail",
      detail: "3 configured, 0 locked",
      items: [
        { label: "core", status: "fail", detail: "unlocked" },
        { label: "ui", status: "fail", detail: "unlocked" },
      ],
      remedy: "pragma sources update",
    },
    { name: "Skills symlinked", status: "skip", detail: "no harness" },
  ],
  passed: 1,
  failed: 1,
  skipped: 1,
};

/** Run `body` with stdout's `isTTY` forced to `value`, then restore it. */
function withStdoutTty(value: boolean | undefined, body: () => void): void {
  const stream = process.stdout as { isTTY?: boolean };
  const saved = stream.isTTY;
  stream.isTTY = value;
  try {
    body();
  } finally {
    stream.isTTY = saved;
  }
}

let prevLevel: number;
beforeAll(() => {
  prevLevel = chalk.level;
});
afterAll(() => {
  chalk.level = prevLevel;
});

describe("doctor render — piped output is ANSI-free (F1)", () => {
  it("plain emits ZERO ANSI off a TTY even when chalk reports color (CI/FORCE_COLOR)", () => {
    chalk.level = 3;
    withStdoutTty(undefined, () => {
      const out = doctorFormatters.plain(DATA);
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting NO ESC byte survives
      expect(out).not.toMatch(/\x1b\[/);
      // The structural, color-free content still renders (glyphs, names, remedy).
      expect(out).toContain("pragma doctor");
      expect(out).toContain("✓  Node version");
      expect(out).toContain("✗  package refs");
      expect(out).toContain("○  Skills symlinked");
      expect(out).toContain("↳ fix: pragma sources update");
      expect(out).toContain("  1 passed · 1 failed · 1 skipped");
    });
  });
});

describe("doctor render — color ON (attended TTY)", () => {
  it("plain tints the output on a color-capable TTY", () => {
    chalk.level = 1;
    withStdoutTty(true, () => {
      // biome-ignore lint/suspicious/noControlCharactersInRegex: asserting the literal ESC byte is the point
      expect(doctorFormatters.plain(DATA)).toMatch(/\x1b\[/);
    });
  });
});
