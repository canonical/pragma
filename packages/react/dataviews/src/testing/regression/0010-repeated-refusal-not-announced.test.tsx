/**
 * Regression: a refusal repeated word for word is announced again.
 *
 * Before the fix, a second identical refusal wrote the same text into the
 * header's live region, which assistive technology reads only when its
 * text changes, so the reader heard nothing the second time; and the
 * reason was visually hidden, so a sighted reader saw nothing either time.
 * The header's region then took a trailing no-break space on every other
 * refusal. Now the table's announcer adds each refusal as a new node, which
 * a live region of additions reads however alike the words.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import readAnnouncements from "../../../testing/readAnnouncements.js";
import renderRefusingTable from "../../../testing/renderRefusingTable.js";

const REFUSED = "Sort unchanged: this source orders by at most 1 term.";

// The announcer's moment is time this case decides, not time it waits out:
// what counts as one moment is the point.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("regression 0010 — a repeated refusal not announced", () => {
  it("announces a second and a third identical refusal as new announcements, words unaltered", async () => {
    const { status, findReason } = renderRefusingTable();
    // The ordering the table applied first is announced too; count from it.
    const before = (await readAnnouncements()).length;
    fireEvent.click(status, { shiftKey: true });
    expect(await readAnnouncements()).toHaveLength(before + 1);
    fireEvent.click(status, { shiftKey: true });
    fireEvent.click(status, { shiftKey: true });
    const said = await readAnnouncements();
    // The second moment says it once, however many times it was refused in
    // that moment, and says it again rather than leaving the first standing.
    expect(said.slice(before)).toEqual([REFUSED, REFUSED]);
    // The header shows the words as they are, with no mark added.
    expect(findReason()?.textContent).toBe(REFUSED);
    expect(findReason()).not.toHaveAttribute("aria-live");
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
