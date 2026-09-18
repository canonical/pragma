import { describe, expect, it } from "vitest";
import type { TimelineItem } from "../types.js";
import { buildFilterOptions } from "./buildFilterOptions.js";

const items: TimelineItem[] = [
  {
    id: "1",
    dateTime: "2024-01-01T00:00:00Z",
    actorId: "jane",
    actorName: "Jane Doe",
    eventType: "comment",
    eventLabel: "Comment",
  },
  {
    id: "2",
    dateTime: "2024-01-02T00:00:00Z",
    actorId: "jane",
    eventType: "approval",
  },
  {
    id: "3",
    dateTime: "2024-01-03T00:00:00Z",
    actorId: "john",
    eventType: "comment",
    eventLabel: "Commented",
  },
  {
    id: "4",
    dateTime: "2024-01-04T00:00:00Z",
    eventType: "deploy",
  },
];

describe("buildFilterOptions", () => {
  it("returns unique values in first-seen order", () => {
    const options = buildFilterOptions(
      items,
      (entry) => entry.actorId,
      (entry) => entry.actorName,
    );
    expect(options).toEqual([
      { value: "jane", label: "Jane Doe" },
      { value: "john", label: "john" },
    ]);
  });

  it("falls back to the value when no label exists", () => {
    const options = buildFilterOptions(
      items,
      (entry) => entry.eventType,
      (entry) => entry.eventLabel,
    );
    expect(options).toEqual([
      { value: "comment", label: "Comment" },
      { value: "approval", label: "approval" },
      { value: "deploy", label: "deploy" },
    ]);
  });

  it("keeps the first label seen for a repeated value", () => {
    const options = buildFilterOptions(
      items,
      (entry) => entry.eventType,
      (entry) => entry.eventLabel,
    );
    expect(options.find((option) => option.value === "comment")?.label).toBe(
      "Comment",
    );
  });

  it("handles an empty list", () => {
    expect(
      buildFilterOptions(
        [],
        (entry) => entry.actorId,
        () => undefined,
      ),
    ).toEqual([]);
  });
});
