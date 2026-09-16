import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** The announcer's stylesheet, without its comments. */
const sheet = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "styles.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

describe("Announcer stylesheet", () => {
  it("hides the region by clipping, taking no room and drawing nothing", () => {
    const rule = sheet.match(/\.ds\.data-views-announcer \{([^{}]*)\}/)?.at(1);
    expect(rule).toBeDefined();
    expect(rule).toMatch(/position:\s*absolute;/);
    expect(rule).toMatch(/clip-path:\s*inset\(50%\);/);
    expect(rule).toMatch(/overflow:\s*hidden;/);
    expect(rule).toMatch(/white-space:\s*nowrap;/);
    // Clipped, never removed from the accessibility tree.
    expect(rule).not.toMatch(/display:\s*none|visibility:\s*hidden/);
  });
});
