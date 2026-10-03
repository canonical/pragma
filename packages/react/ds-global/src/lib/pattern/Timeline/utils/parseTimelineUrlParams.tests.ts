import { describe, expect, it } from "vitest";
import parseTimelineUrlParams from "./parseTimelineUrlParams.js";

const parse = (query: string, prefix = "tl") =>
  parseTimelineUrlParams(new URLSearchParams(query), prefix);

describe("parseTimelineUrlParams", () => {
  it("reads filters and sort order", () => {
    expect(parse("tl.actor=jane&tl.event=comment&tl.sort=newest")).toEqual({
      filters: { actorId: "jane", eventType: "comment" },
      sortOrder: "newest",
    });
  });

  it("reads an empty query as unset", () => {
    expect(parse("")).toEqual({
      filters: { actorId: undefined, eventType: undefined },
      sortOrder: undefined,
    });
  });

  it("reads only the keys under the prefix", () => {
    expect(parse("tl.actor=jane&history.actor=john", "history")).toEqual({
      filters: { actorId: "john", eventType: undefined },
      sortOrder: undefined,
    });
  });

  it("ignores foreign params", () => {
    expect(parse("actor=jane&page=2&tl.sort=oldest")).toEqual({
      filters: { actorId: undefined, eventType: undefined },
      sortOrder: "oldest",
    });
  });

  it("reads an unknown sort order as unset", () => {
    expect(parse("tl.sort=sideways").sortOrder).toBeUndefined();
  });

  it("reads empty values as unset", () => {
    expect(parse("tl.actor=&tl.event=&tl.sort=")).toEqual({
      filters: { actorId: undefined, eventType: undefined },
      sortOrder: undefined,
    });
  });

  it("reads the first value of a repeated key", () => {
    expect(parse("tl.actor=jane&tl.actor=john").filters.actorId).toBe("jane");
  });

  it("decodes encoded values", () => {
    expect(parse("tl.actor=jane%20doe&tl.event=a%26b").filters).toEqual({
      actorId: "jane doe",
      eventType: "a&b",
    });
  });
});
