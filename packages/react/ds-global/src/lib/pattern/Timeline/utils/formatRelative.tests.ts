import { describe, expect, it } from "vitest";
import { formatRelative } from "./formatRelative.js";

const NOW = Date.parse("2024-06-15T12:00:00Z");

describe("formatRelative", () => {
  it("formats seconds ago", () => {
    expect(formatRelative("2024-06-15T11:59:30Z", NOW, "en")).toBe(
      "30 seconds ago",
    );
  });

  it("formats minutes ago", () => {
    expect(formatRelative("2024-06-15T11:55:00Z", NOW, "en")).toBe(
      "5 minutes ago",
    );
  });

  it("formats hours ahead", () => {
    expect(formatRelative("2024-06-15T14:00:00Z", NOW, "en")).toBe(
      "in 2 hours",
    );
  });

  it("formats days ago", () => {
    expect(formatRelative("2024-06-13T12:00:00Z", NOW, "en")).toBe(
      "2 days ago",
    );
  });

  it("formats weeks ago", () => {
    expect(formatRelative("2024-06-01T12:00:00Z", NOW, "en")).toBe(
      "2 weeks ago",
    );
  });

  it("formats months ago", () => {
    expect(formatRelative("2024-04-10T12:00:00Z", NOW, "en")).toBe(
      "2 months ago",
    );
  });

  it("formats years ahead", () => {
    expect(formatRelative("2026-06-15T12:00:00Z", NOW, "en")).toBe(
      "in 2 years",
    );
  });

  it("returns an empty string for invalid input", () => {
    expect(formatRelative("not-a-date", NOW, "en")).toBe("");
  });
});
