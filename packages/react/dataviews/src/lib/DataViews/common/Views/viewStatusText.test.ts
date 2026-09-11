import type { SavedView, ViewOperation } from "@canonical/dataviews-core/views";
import { describe, expect, it } from "vitest";
import viewStatusText from "./viewStatusText.js";

const view: SavedView = {
  id: "v1",
  name: "Failed",
  query: "as=table&status=failed",
  presentation: null,
  revision: 2,
  pinned: false,
  createdAt: "2026-09-11T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
};

type Action = ViewOperation["action"];
type Outcome = Extract<ViewOperation, { status: "settled" }>["outcome"];

const actions: readonly Action[] = [
  "open",
  "save",
  "saveAs",
  "rename",
  "remove",
];

/** What the status says for each action settling to one outcome. */
const settledAs = (outcome: Outcome, modified = false): string[] =>
  actions.map((action) =>
    viewStatusText({ action, status: "settled", outcome }, modified),
  );

describe("viewStatusText", () => {
  it("says nothing before the first operation, then what is in flight", () => {
    expect(viewStatusText(null, false)).toBe("");
    expect(
      actions.map((action) =>
        viewStatusText({ action, status: "pending" }, false),
      ),
    ).toEqual([
      "Opening the view…",
      "Saving…",
      "Saving…",
      "Renaming…",
      "Deleting…",
    ]);
  });

  it("confirms an open or a save only while the query is still the view's, a rename always", () => {
    const opened = { status: "opened", view } as const;
    const saved = { status: "saved", view } as const;
    expect(settledAs(opened)[0]).toBe('Opened "Failed".');
    expect(settledAs(opened, true)[0]).toBe("");
    expect(settledAs(saved).slice(1, 4)).toEqual([
      'Saved "Failed".',
      'Saved "Failed".',
      'Renamed to "Failed".',
    ]);
    expect(settledAs(saved, true).slice(1, 4)).toEqual([
      "",
      "",
      'Renamed to "Failed".',
    ]);
    expect(settledAs({ status: "removed" })[4]).toBe("View deleted.");
  });

  it("names every reason a view was refused, and says the query stands", () => {
    expect(
      settledAs({
        status: "refused",
        view,
        issues: [
          { parameter: "cores__gte", reason: '"zero" is not a number' },
          { parameter: "sort", reason: "sorting is not supported" },
        ],
      })[0],
    ).toBe(
      'Not opened: "Failed" asks for what this collection cannot show — "zero" is not a number; sorting is not supported. The query is unchanged.',
    );
  });

  it("never reports a conflict as saved, and says how to recover", () => {
    const [, save, saveAs, rename, remove] = settledAs({
      status: "conflict",
      view,
    });
    expect(save).toBe(
      'Not saved: "Failed" was changed elsewhere. Overwrite it, save your changes as a new view, or discard them.',
    );
    expect(saveAs).toBe(
      "Not saved: a different view is stored under the same identity. Try again.",
    );
    expect([rename, remove]).toEqual([
      'Not renamed: "Failed" was changed elsewhere. Its latest version is open; try again.',
      'Not deleted: "Failed" was changed elsewhere. Its latest version is open; try again.',
    ]);
  });

  it("says a view is gone, unreadable or not written, for the operation tried", () => {
    expect(settledAs({ status: "missing" })[0]).toBe(
      "Not opened: the view no longer exists.",
    );
    expect(settledAs({ status: "unreadable", reason: "corrupt" })[1]).toBe(
      "Not saved: the stored view cannot be read (corrupt).",
    );
    expect(settledAs({ status: "failed", reason: "quota exceeded" })[4]).toBe(
      "Not deleted: quota exceeded.",
    );
  });
});
