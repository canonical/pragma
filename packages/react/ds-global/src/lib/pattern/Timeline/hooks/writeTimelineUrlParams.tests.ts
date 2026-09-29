import { afterEach, describe, expect, it } from "vitest";
import writeTimelineUrlParams from "./writeTimelineUrlParams.js";

function replaceSearch(search: string): void {
  window.history.replaceState(window.history.state, "", `/${search}`);
}

describe("writeTimelineUrlParams", () => {
  afterEach(() => {
    replaceSearch("");
  });

  it("writes filter and sort params", () => {
    replaceSearch("");
    writeTimelineUrlParams("tl", {
      filters: { actorId: "jane", eventType: "comment" },
      sortOrder: "newest",
    });
    expect(window.location.search).toBe(
      "?tl.actor=jane&tl.event=comment&tl.sort=newest",
    );
  });

  it("removes params for cleared values", () => {
    replaceSearch("?tl.actor=jane&tl.sort=newest&other=1");
    writeTimelineUrlParams("tl", {
      filters: { actorId: undefined, eventType: undefined },
      sortOrder: undefined,
    });
    expect(window.location.search).toBe("?other=1");
  });

  it("namespaces keys with the given prefix", () => {
    replaceSearch("");
    writeTimelineUrlParams("history", {
      filters: { actorId: "jane", eventType: undefined },
      sortOrder: undefined,
    });
    expect(window.location.search).toBe("?history.actor=jane");
  });

  it("keeps the current history entry in the default replace mode", () => {
    replaceSearch("");
    const before = window.history.length;
    writeTimelineUrlParams("tl", {
      filters: { actorId: "jane", eventType: undefined },
      sortOrder: undefined,
    });
    expect(window.history.length).toBe(before);
    expect(window.location.search).toBe("?tl.actor=jane");
  });

  it("adds a history entry in push mode", () => {
    replaceSearch("");
    const before = window.history.length;
    writeTimelineUrlParams(
      "tl",
      {
        filters: { actorId: "jane", eventType: undefined },
        sortOrder: undefined,
      },
      "push",
    );
    expect(window.history.length).toBe(before + 1);
    expect(window.location.search).toBe("?tl.actor=jane");
  });
});
