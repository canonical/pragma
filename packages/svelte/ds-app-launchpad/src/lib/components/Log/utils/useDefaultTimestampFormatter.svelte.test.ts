import { afterEach, describe, expect, it, vi } from "vitest";
import type { TimeZone } from "../types.js";
import { useDefaultTimestampFormatter } from "./useDefaultTimestampFormatter.svelte.js";

describe("useDefaultTimestampFormatter", () => {
  const date = new Date("2024-01-15T14:30:45.123Z");

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("UTC", () => {
    it("formats UTC timestamps", () => {
      const { format } = useDefaultTimestampFormatter(() => "UTC");
      expect(format(date)).toBe("2024-01-15 14:30:45.123");
    });

    it("pads date and time parts", () => {
      const paddedDate = new Date("2024-02-03T04:05:06.007Z");
      const { format } = useDefaultTimestampFormatter(() => "UTC");
      expect(format(paddedDate)).toBe("2024-02-03 04:05:06.007");
    });
  });

  describe("local timezone", () => {
    it("formats using runtime timezone", () => {
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
        "America/Los_Angeles",
      );
      const { format } = useDefaultTimestampFormatter(() => "local");
      expect(format(date)).toBe("2024-01-15 06:30:45.123");
    });
  });

  describe("explicit timezone", () => {
    it("formats using provided timezone", () => {
      expect(
        useDefaultTimestampFormatter(() => "Asia/Tokyo").format(date),
      ).toBe("2024-01-15 23:30:45.123");
      expect(
        useDefaultTimestampFormatter(() => "Europe/Warsaw").format(date),
      ).toBe("2024-01-15 15:30:45.123");
    });

    it("keeps output stable across repeated calls", () => {
      const { format } = useDefaultTimestampFormatter(() => "Asia/Tokyo");
      expect(format(date)).toBe(format(date));
    });
  });

  describe("invalid timezone fallback", () => {
    it("falls back to UTC and warns", () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      const { format } = useDefaultTimestampFormatter(() => "Invalid/TimeZone");
      const result = format(date);

      expect(result).toBe("2024-01-15 14:30:45.123");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        'Invalid timezone "Invalid/TimeZone" provided to Log component. Falling back to UTC.',
      );
    });

    it("does not warn for valid UTC", () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      useDefaultTimestampFormatter(() => "UTC").format(date);

      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe("reactivity", () => {
    it("updates formatter when timezone changes", () => {
      let timeZone = $state<TimeZone>("UTC");
      const { format } = useDefaultTimestampFormatter(() => timeZone);

      const result = $derived(format(date));

      expect(result).toBe("2024-01-15 14:30:45.123");

      timeZone = "Asia/Tokyo";

      expect(result).toBe("2024-01-15 23:30:45.123");

      timeZone = "Pacific/Kanton";

      expect(result).toBe("2024-01-16 03:30:45.123");

      timeZone = "Invalid/TimeZone";

      expect(result).toBe("2024-01-15 14:30:45.123");
    });

    it("does not recreate the formatter on repeated calls with the same timezone", () => {
      const dateTimeFormatSpy = spyOnDateTimeFormatConstruction();
      const { format } = useDefaultTimestampFormatter(
        () => "Pacific/Kiritimati",
      );

      format(date);
      format(date);

      expect(dateTimeFormatSpy).toHaveBeenCalledTimes(1);
    });

    it("recreates the formatter when timezone changes", () => {
      let timeZone = $state<TimeZone>("UTC");
      const dateTimeFormatSpy = spyOnDateTimeFormatConstruction();
      const { format } = useDefaultTimestampFormatter(() => timeZone);

      format(date);

      timeZone = "Asia/Tokyo";

      format(date);

      expect(dateTimeFormatSpy).toHaveBeenCalledTimes(2);
    });
  });
});

function spyOnDateTimeFormatConstruction() {
  const OriginalDateTimeFormat = Intl.DateTimeFormat;

  // biome-ignore lint/complexity/useArrowFunction: DateTimeFormat mock is called with `new` so must be a regular function, not an arrow one
  return vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (
    ...args
  ) {
    return new OriginalDateTimeFormat(...args);
  });
}
