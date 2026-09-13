import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isCalendarDate } from "../schema/index.js";
import readInstant from "./readInstant.js";

describe("readInstant", () => {
  it("reads a calendar date as UTC midnight", () => {
    expect(readInstant("2026-01-02")).toBe(Date.UTC(2026, 0, 2));
  });

  it("reads an instant with Z, with an offset, and with fractions", () => {
    expect(readInstant("2026-01-02T06:00:00Z")).toBe(Date.UTC(2026, 0, 2, 6));
    expect(readInstant("2026-01-02T01:00:00-05:00")).toBe(
      Date.UTC(2026, 0, 2, 6),
    );
    expect(readInstant("2026-01-02T11:00:00+05:00")).toBe(
      Date.UTC(2026, 0, 2, 6),
    );
    expect(readInstant("2026-01-02T11:30:00+05:30")).toBe(
      Date.UTC(2026, 0, 2, 6),
    );
    expect(readInstant("2026-01-02T02:30:00-03:30")).toBe(
      Date.UTC(2026, 0, 2, 6),
    );
    expect(readInstant("2026-01-02T06:00Z")).toBe(Date.UTC(2026, 0, 2, 6));
    expect(readInstant("2026-01-02T06:00:00.1234Z")).toBe(
      Date.UTC(2026, 0, 2, 6, 0, 0, 123),
    );
  });

  it("reads a Date and epoch milliseconds", () => {
    expect(readInstant(new Date(1234))).toBe(1234);
    expect(readInstant(1234)).toBe(1234);
    expect(readInstant(-1234)).toBe(-1234);
  });

  it("means the year it spells, below the century Date.UTC would shift", () => {
    expect(readInstant("0026-01-02")).toBe(
      Date.parse("0026-01-02T00:00:00.000Z"),
    );
  });

  it("has no instant for a time of day carrying no offset", () => {
    // ECMA-262 reads it as local time, which orders one way on a server and
    // another in a browser.
    expect(readInstant("2026-01-02T06:00:00")).toBeNull();
  });

  it("has no instant for a date the calendar does not have", () => {
    expect(readInstant("2026-02-30")).toBeNull();
    expect(readInstant("2026-13-01")).toBeNull();
    expect(readInstant("2026-00-01")).toBeNull();
    expect(readInstant("2026-01-00")).toBeNull();
    expect(readInstant("2025-02-29")).toBeNull();
    expect(readInstant("2024-02-29")).toBe(Date.UTC(2024, 1, 29));
    expect(readInstant("2000-02-29")).toBe(Date.UTC(2000, 1, 29));
    expect(readInstant("1900-02-29")).toBeNull();
  });

  it("has no instant for an out-of-range time or offset", () => {
    expect(readInstant("2026-01-02T24:00:00Z")).toBeNull();
    expect(readInstant("2026-01-02T06:60:00Z")).toBeNull();
    expect(readInstant("2026-01-02T06:00:60Z")).toBeNull();
    expect(readInstant("2026-01-02T06:00:00+24:00")).toBeNull();
    expect(readInstant("2026-01-02T06:00:00+05:60")).toBeNull();
  });

  it("has no instant for an object merely dressed as a Date", () => {
    // Either would throw when asked the time; neither may stop a sort.
    expect(readInstant(Object.create(Date.prototype))).toBeNull();
    expect(readInstant({ [Symbol.toStringTag]: "Date" })).toBeNull();
  });

  it("has no instant for anything else", () => {
    expect(readInstant("yesterday")).toBeNull();
    expect(readInstant("2026/01/02")).toBeNull();
    expect(readInstant(new Date(Number.NaN))).toBeNull();
    expect(readInstant(Number.NaN)).toBeNull();
    expect(readInstant(Number.POSITIVE_INFINITY)).toBeNull();
    expect(readInstant(true)).toBeNull();
    expect(readInstant(null)).toBeNull();
    expect(readInstant(undefined)).toBeNull();
  });

  describe("in a zone that is not UTC", () => {
    // Every spelling reads as the same instant wherever it is read; a local
    // clock anywhere in the arithmetic would move it with the zone. The zone
    // is off the hour, so an hour-shaped mistake cannot cancel out.
    const zone = process.env["TZ"];
    beforeAll(() => {
      process.env["TZ"] = "America/St_Johns";
    });
    afterAll(() => {
      process.env["TZ"] = zone;
    });

    it("reads calendar dates and instants as they are read in UTC", () => {
      expect(new Date(Date.UTC(2026, 0, 2)).getTimezoneOffset()).toBe(210);
      expect(readInstant("2026-01-02")).toBe(Date.UTC(2026, 0, 2));
      expect(readInstant("2026-01-02T11:30:00+05:30")).toBe(
        Date.UTC(2026, 0, 2, 6),
      );
      expect(readInstant("0026-01-02")).toBe(
        Date.parse("0026-01-02T00:00:00.000Z"),
      );
    });
  });
});

describe("isCalendarDate", () => {
  it("accepts a real calendar date and nothing else", () => {
    expect(isCalendarDate("2026-01-02")).toBe(true);
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("2026-01-02T06:00:00Z")).toBe(false);
  });
});
