import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatTimestamp as formatTimestampImport } from "./formatTimestamp.js";

describe("formatTimestamp", () => {
  const date = new Date("2024-01-15T14:30:45.123Z");
  let formatTimestamp: typeof formatTimestampImport;

  beforeEach(async () => {
    vi.resetModules();
    ({ formatTimestamp } = await import("./formatTimestamp.js"));
  });

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
        'Invalid timezone "Invalid/TimeZone" provided to formatTimestamp. Falling back to UTC. Future warnings for this timezone will not be shown.',
      );
    });

    it("warns only once per invalid timezone", () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      formatTimestamp(date, "Invalid/TimeZone");
      formatTimestamp(date, "Invalid/TimeZone");

      expect(warn).toHaveBeenCalledTimes(1);
    });

    it("does not warn for valid UTC", () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      formatTimestamp(date, "UTC");

      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("caching", () => {
    it("reuses the formatter for repeated valid timezones", () => {
      const dateTimeFormatSpy = spyOnDateTimeFormatConstruction();

      formatTimestamp(date, "Pacific/Kiritimati");
      formatTimestamp(date, "Pacific/Kiritimati");

      expect(dateTimeFormatSpy).toHaveBeenCalledTimes(1);
    });

    it("reuses the cached formatter for 'local' timezone", () => {
      const dateTimeFormatSpy = spyOnDateTimeFormatConstruction();

      formatTimestamp(date, "local");
      formatTimestamp(date, "local");

      expect(dateTimeFormatSpy).toHaveBeenCalledTimes(1);
    });

    it("reuses the cached formatter for `UTC` timezone", () => {
      const dateTimeFormatSpy = spyOnDateTimeFormatConstruction();

      formatTimestamp(date, "UTC");
      formatTimestamp(date, "UTC");

      expect(dateTimeFormatSpy).toHaveBeenCalledTimes(1);
    });

    it("reuses the cached UTC fallback for repeated invalid timezones", () => {
      const dateTimeFormatSpy = spyOnDateTimeFormatConstruction();

      formatTimestamp(date, "Invalid/Cache-Test");
      formatTimestamp(date, "Invalid/Cache-Test");
      formatTimestamp(date, "Invalid/Cache-Test");

      expect(dateTimeFormatSpy).toHaveBeenCalledTimes(2); // 1 for the invalid timezone, 1 for the UTC fallback
    });
  });
});

function spyOnDateTimeFormatConstruction() {
  const OriginalDateTimeFormat = Intl.DateTimeFormat;

  return vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (
    ...args
  ) {
    return new OriginalDateTimeFormat(...args);
  });
}
