/**
 * Regression: a refusal's reason never takes a pointer's click.
 *
 * Before the fix, the reason sat over the first row, above it, and caught
 * pointer events: a click on the first row's checkbox beneath it landed on
 * the reason, which cleared as focus left the header, and the click was
 * lost.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sheet = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../lib/_work_in_progress/DataTable/styles.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

describe("regression 0020 — a sort reason swallowed row clicks", () => {
  it("lets pointer events through to the row beneath", () => {
    const rule = sheet.match(/& > \.sort-reason \{([^{}]*)/)?.at(1);
    expect(rule).toMatch(/pointer-events:\s*none;/);
  });
});
