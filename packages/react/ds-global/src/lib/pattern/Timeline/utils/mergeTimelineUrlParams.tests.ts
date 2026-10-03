import { describe, expect, it } from "vitest";
import type { TimelineUrlState } from "../types.js";
import mergeTimelineUrlParams from "./mergeTimelineUrlParams.js";
import parseTimelineUrlParams from "./parseTimelineUrlParams.js";

const merge = (query: string, state: TimelineUrlState, prefix = "tl") =>
  mergeTimelineUrlParams(new URLSearchParams(query), state, prefix).toString();

describe("mergeTimelineUrlParams", () => {
  it("writes filters and sort order", () => {
    expect(
      merge("", {
        filters: { actorId: "jane", eventType: "comment" },
        sortOrder: "newest",
      }),
    ).toBe("tl.actor=jane&tl.event=comment&tl.sort=newest");
  });

  it("keeps foreign params", () => {
    expect(merge("page=2", { filters: { actorId: "jane" } })).toBe(
      "page=2&tl.actor=jane",
    );
  });

  it("keeps repeated foreign keys and their order", () => {
    expect(
      merge("status=failed&tl.actor=john&status=cancelled", {
        filters: { actorId: "jane" },
      }),
    ).toBe("status=failed&tl.actor=jane&status=cancelled");
  });

  it("removes only the cleared filter's key", () => {
    expect(
      merge("tl.actor=jane&tl.event=comment&tl.sort=newest&page=2", {
        filters: { eventType: "comment" },
        sortOrder: "newest",
      }),
    ).toBe("tl.event=comment&tl.sort=newest&page=2");
  });

  it("removes keys for empty values", () => {
    expect(
      merge("tl.actor=jane&tl.event=comment", {
        filters: { actorId: "", eventType: "" },
      }),
    ).toBe("");
  });

  it("collapses a repeated Timeline key into one", () => {
    expect(
      merge("tl.actor=jane&tl.actor=john", { filters: { actorId: "ann" } }),
    ).toBe("tl.actor=ann");
  });

  it("writes only under its prefix", () => {
    expect(
      merge("tl.actor=jane", { filters: { actorId: "john" } }, "history"),
    ).toBe("tl.actor=jane&history.actor=john");
  });

  it("does not modify the current params", () => {
    const current = new URLSearchParams("page=2");
    mergeTimelineUrlParams(current, { filters: { actorId: "jane" } }, "tl");
    expect(current.toString()).toBe("page=2");
  });

  it("round-trips through parseTimelineUrlParams", () => {
    const state: TimelineUrlState = {
      filters: { actorId: "jane doe", eventType: "a&b" },
      sortOrder: "oldest",
    };
    const params = mergeTimelineUrlParams(
      new URLSearchParams("page=2"),
      state,
      "tl",
    );
    expect(parseTimelineUrlParams(params, "tl")).toEqual(state);
    expect(params.get("page")).toBe("2");
  });
});
