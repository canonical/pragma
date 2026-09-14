/**
 * Regression: a refusal repeated word for word is announced again.
 *
 * Before the fix, a second identical refusal wrote the same text into the
 * header's live region, which assistive technology reads only when its
 * text changes, so the reader heard nothing the second time; and the
 * reason was visually hidden, so a sighted reader saw nothing either time.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import renderRefusingTable from "../../../testing/renderRefusingTable.js";

describe("regression 0010 — a repeated refusal not announced", () => {
  it("changes the live region's text for a second identical refusal", () => {
    const { status, findReason } = renderRefusingTable();
    fireEvent.click(status, { shiftKey: true });
    const once = findReason()?.textContent;
    expect(once).toContain("this source orders by at most 1 term");
    fireEvent.click(status, { shiftKey: true });
    const twice = findReason()?.textContent;
    expect(twice?.trim()).toBe(once?.trim());
    expect(twice).not.toBe(once);
    // And every repeat after, not only the second.
    fireEvent.click(status, { shiftKey: true });
    const thrice = findReason()?.textContent;
    expect(thrice?.trim()).toBe(once?.trim());
    expect(thrice).not.toBe(twice);
  });

  it("shows the reason rather than clipping it out of sight", () => {
    const sheet = readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../lib/_work_in_progress/DataTable/styles.css",
      ),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = sheet.match(/& > \.sort-reason \{([\s\S]*?)\n {4}\}/)?.at(1);
    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/clip-path|overflow:\s*hidden|inline-size:\s*0/);
  });
});
