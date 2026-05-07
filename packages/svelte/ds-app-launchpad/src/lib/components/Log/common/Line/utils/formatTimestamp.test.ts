import { afterEach, describe, expect, it, vi } from "vitest";
import { formatTimestamp } from "./formatTimestamp.js";

describe("formatTimestamp", () => {
  const date = new Date("2024-01-15T14:30:45.123Z");

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("UTC", () => {
    it("formats UTC timestamps", () => {
      expect(formatTimestamp(date, "UTC")).toBe("2024-01-15 14:30:45.123");
    });

    it("pads date and time parts", () => {
      const paddedDate = new Date("2024-02-03T04:05:06.007Z");
      expect(formatTimestamp(paddedDate, "UTC")).toBe(
        "2024-02-03 04:05:06.007",
      );
    });
  });

  describe("local timezone", () => {
    it("formats using runtime timezone", () => {
      expect(process.env.TZ).toBe("America/Los_Angeles");
      expect(formatTimestamp(date, "local")).toBe("2024-01-15 06:30:45.123");
    });
  });

  describe("explicit timezone", () => {
    it("formats using provided timezone", () => {
      expect(formatTimestamp(date, "Asia/Tokyo")).toBe(
        "2024-01-15 23:30:45.123",
      );
      expect(formatTimestamp(date, "Europe/Warsaw")).toBe(
        "2024-01-15 15:30:45.123",
      );
    });

    it("keeps output stable across repeated calls", () => {
      const first = formatTimestamp(date, "Asia/Tokyo");
      const second = formatTimestamp(date, "Asia/Tokyo");

      expect(second).toBe(first);
    });
  });

  describe("invalid timezone fallback", () => {
    it("falls back to UTC and warns", () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      const result = formatTimestamp(date, "Invalid/TimeZone");

      expect(result).toBe("2024-01-15 14:30:45.123");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        'Invalid timezone "Invalid/TimeZone" provided to formatTimestamp. Falling back to UTC.',
      );
    });

    it("does not warn for valid UTC", () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      formatTimestamp(date, "UTC");

      expect(warn).not.toHaveBeenCalled();
    });
  });
});
