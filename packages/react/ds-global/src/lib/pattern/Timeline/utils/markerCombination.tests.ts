import { describe, expect, it } from "vitest";
import type { TimelineItem } from "../types.js";
import { resolveMarkerSizes } from "./markerCombination.js";

const item = (
  id: string,
  actorId: string | undefined,
  eventType: string | undefined,
): TimelineItem => ({
  id,
  dateTime: "2024-01-01T00:00:00Z",
  actorId,
  eventType,
});

describe("resolveMarkerSizes", () => {
  it("returns a constant size for single-size combinations", () => {
    const items = [item("1", "jane", "comment"), item("2", "jane", "comment")];
    expect(resolveMarkerSizes(items, "large")).toEqual(["large", "large"]);
    expect(resolveMarkerSizes(items, "medium")).toEqual(["medium", "medium"]);
    expect(resolveMarkerSizes(items, "small")).toEqual(["small", "small"]);
  });

  it("all-sizes: large per actor run, medium per type run, small for the rest", () => {
    const items = [
      item("1", "jane", "comment"),
      item("2", "jane", "comment"),
      item("3", "jane", "approval"),
      item("4", "jane", "approval"),
      item("5", "john", "comment"),
      item("6", "john", "comment"),
    ];
    expect(resolveMarkerSizes(items, "all-sizes")).toEqual([
      "large",
      "small",
      "medium",
      "small",
      "large",
      "small",
    ]);
  });

  it("large-medium: large per actor run, medium for the rest", () => {
    const items = [
      item("1", "jane", "comment"),
      item("2", "jane", "comment"),
      item("3", "john", "comment"),
    ];
    expect(resolveMarkerSizes(items, "large-medium")).toEqual([
      "large",
      "medium",
      "large",
    ]);
  });

  it("large-small: large per actor run, small for the rest", () => {
    const items = [item("1", "jane", "comment"), item("2", "jane", "comment")];
    expect(resolveMarkerSizes(items, "large-small")).toEqual([
      "large",
      "small",
    ]);
  });

  it("medium-small: medium per actor run, small for the rest", () => {
    const items = [item("1", "jane", "comment"), item("2", "jane", "comment")];
    expect(resolveMarkerSizes(items, "medium-small")).toEqual([
      "medium",
      "small",
    ]);
  });

  it("items without an actor break the run", () => {
    const items = [item("1", "jane", "comment"), item("2", undefined, "x")];
    expect(resolveMarkerSizes(items, "large-medium")).toEqual([
      "large",
      "medium",
    ]);
  });

  it("handles an empty list", () => {
    expect(resolveMarkerSizes([], "all-sizes")).toEqual([]);
  });
});
