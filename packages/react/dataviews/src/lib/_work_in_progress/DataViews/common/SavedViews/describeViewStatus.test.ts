import type {
  ViewCommand,
  ViewSettledOutcome,
} from "@canonical/dataviews-core";
import { describe, expect, it } from "vitest";
import { buildStoredView } from "../../../../../../testing/fixtures.js";
import describeViewStatus from "./describeViewStatus.js";

const view = buildStoredView({ revision: 2 });

type Command = ViewCommand;
type Outcome = ViewSettledOutcome;

const commands: readonly Command[] = [
  "open",
  "save",
  "save-as",
  "rename",
  "remove",
];

/** What the status says for each command settling to one outcome. */
const describeSettledAs = (outcome: Outcome, modified = false): string[] =>
  commands.map((command) =>
    describeViewStatus({ command, status: "settled", outcome }, modified),
  );

describe("describeViewStatus", () => {
  it("says nothing before the first command, then what is in flight", () => {
    expect(describeViewStatus(null, false)).toBe("");
    expect(
      commands.map((command) =>
        describeViewStatus({ command, status: "pending" }, false),
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
    expect(describeSettledAs(opened)[0]).toBe('Opened "Failed".');
    expect(describeSettledAs(opened, true)[0]).toBe("");
    expect(describeSettledAs(saved).slice(1, 4)).toEqual([
      'Saved "Failed".',
      'Saved "Failed".',
      'Renamed to "Failed".',
    ]);
    expect(describeSettledAs(saved, true).slice(1, 4)).toEqual([
      "",
      "",
      'Renamed to "Failed".',
    ]);
    expect(describeSettledAs({ status: "removed" })[4]).toBe("View deleted.");
  });

  it("names every reason a view was refused, and says the query stands", () => {
    expect(
      describeSettledAs({
        status: "refused",
        view,
        issues: [
          {
            parameter: "cores__gte",
            code: "invalid",
            reason: '"zero" is not a number',
          },
          {
            parameter: "sort",
            code: "too-many-terms",
            reason: "sorting is not supported",
          },
        ],
      })[0],
    ).toBe(
      'Not opened: "Failed" asks for what this collection cannot show — "zero" is not a number; sorting is not supported. The query is unchanged.',
    );
  });

  it("never reports a conflict as saved, and says how to recover", () => {
    const [, save, saveAs, rename, remove] = describeSettledAs({
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

  it("says a view is gone, unreadable or not written, for the command tried", () => {
    expect(describeSettledAs({ status: "missing" })[0]).toBe(
      "Not opened: the view no longer exists.",
    );
    expect(
      describeSettledAs({ status: "unreadable", reason: "corrupt" })[1],
    ).toBe("Not saved: the stored view cannot be read (corrupt).");
    expect(
      describeSettledAs({ status: "failed", reason: "quota exceeded" })[4],
    ).toBe("Not deleted: quota exceeded.");
  });
});
