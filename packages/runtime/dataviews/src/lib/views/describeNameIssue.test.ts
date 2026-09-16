import { describe, expect, it } from "vitest";
import { buildStoredView } from "../../../testing/fixtures.js";
import { INITIAL_VIEWS_STATE } from "./constants.js";
import describeNameIssue from "./describeNameIssue.js";
import type { SavedView, ViewsState } from "./types.js";

const buildView = (id: string, name: string): SavedView =>
  buildStoredView({ id, name, query: "" });

const listed: ViewsState = {
  ...INITIAL_VIEWS_STATE,
  listing: { status: "ready" },
  views: [buildView("a", "Café")],
  current: buildView("b", "Running"),
};

describe("describeNameIssue", () => {
  it("refuses an empty name before anything else", () => {
    expect(describeNameIssue("   ", INITIAL_VIEWS_STATE, null)).toBe(
      "a view needs a name",
    );
  });

  it("refuses to check a name before the views are listed", () => {
    expect(describeNameIssue("New", INITIAL_VIEWS_STATE, null)).toBe(
      "the saved views are not listed, so the name cannot be checked",
    );
  });

  it("refuses a name a listed or the open view already has, case and composition folded", () => {
    expect(describeNameIssue(" CAFÉ ", listed, null)).toBe(
      'a view named "Café" already exists',
    );
    expect(describeNameIssue("running", listed, null)).toBe(
      'a view named "Running" already exists',
    );
    expect(describeNameIssue("Stopped", listed, null)).toBeNull();
  });

  it("lets the excepted view keep its own name", () => {
    expect(describeNameIssue("RUNNING", listed, "b")).toBeNull();
    expect(describeNameIssue("Café", listed, "b")).toBe(
      'a view named "Café" already exists',
    );
  });
});
