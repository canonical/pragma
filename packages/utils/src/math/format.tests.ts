import { describe, expect, it } from "vitest";
import format, { formatWithUnit } from "./format.js";

describe("formatWithUnit", () => {
  it("should format numbers less than 1000", () => {
    expect(formatWithUnit(123)).toEqual({
      displayValue: "123",
      unitSuffix: "",
      unitIndex: 0,
    });
    expect(formatWithUnit(999)).toEqual({
      displayValue: "999",
      unitSuffix: "",
      unitIndex: 0,
    });
    expect(formatWithUnit(50)).toEqual({
      displayValue: "50",
      unitSuffix: "",
      unitIndex: 0,
    });
  });

  it("should format numbers with k suffix", () => {
    expect(formatWithUnit(1200)).toEqual({
      displayValue: "1.2k",
      unitSuffix: "k",
      unitIndex: 1,
    });
    expect(formatWithUnit(1500)).toEqual({
      displayValue: "1.5k",
      unitSuffix: "k",
      unitIndex: 1,
    });
    expect(formatWithUnit(999999)).toEqual({
      displayValue: "999k",
      unitSuffix: "k",
      unitIndex: 1,
    });
  });

  it("should format numbers with M suffix", () => {
    expect(formatWithUnit(132456455)).toEqual({
      displayValue: "132M",
      unitSuffix: "M",
      unitIndex: 2,
    });
    expect(formatWithUnit(1500000)).toEqual({
      displayValue: "1.5M",
      unitSuffix: "M",
      unitIndex: 2,
    });
    expect(formatWithUnit(999999999)).toEqual({
      displayValue: "999M",
      unitSuffix: "M",
      unitIndex: 2,
    });
  });

  it("should format numbers with B suffix", () => {
    expect(formatWithUnit(13245645512)).toEqual({
      displayValue: "13B",
      unitSuffix: "B",
      unitIndex: 3,
    });
    expect(formatWithUnit(1500000000)).toEqual({
      displayValue: "1.5B",
      unitSuffix: "B",
      unitIndex: 3,
    });
    expect(formatWithUnit(999999999999)).toEqual({
      displayValue: "999B",
      unitSuffix: "B",
      unitIndex: 3,
    });
  });

  it("should format numbers with T suffix", () => {
    expect(formatWithUnit(132456455123112)).toEqual({
      displayValue: "132T",
      unitSuffix: "T",
      unitIndex: 4,
    });
    expect(formatWithUnit(1500000000000)).toEqual({
      displayValue: "1.5T",
      unitSuffix: "T",
      unitIndex: 4,
    });
    expect(formatWithUnit(999999999999999)).toEqual({
      displayValue: "999T",
      unitSuffix: "T",
      unitIndex: 4,
    });
  });

  it("should support variable precision", () => {
    expect(
      formatWithUnit(132456455, {
        significantDigits: 9,
        decimalsPolicy: "always",
      }),
    ).toEqual({
      displayValue: "132.456455M",
      unitSuffix: "M",
      unitIndex: 2,
    });
    expect(
      formatWithUnit(13245645512, {
        significantDigits: 11,
        decimalsPolicy: "always",
      }),
    ).toEqual({
      displayValue: "13.245645512B",
      unitSuffix: "B",
      unitIndex: 3,
    });
    expect(
      formatWithUnit(132456455123112, {
        significantDigits: 15,
        decimalsPolicy: "always",
      }),
    ).toEqual({
      displayValue: "132.456455123112T",
      unitSuffix: "T",
      unitIndex: 4,
    });
  });

  it("should handle custom units", () => {
    const customUnits = ["", "K", "M", "G"];
    expect(formatWithUnit(1500, { units: customUnits })).toEqual({
      displayValue: "1.5K",
      unitSuffix: "K",
      unitIndex: 1,
    });
    expect(formatWithUnit(1500000, { units: customUnits })).toEqual({
      displayValue: "1.5M",
      unitSuffix: "M",
      unitIndex: 2,
    });
    expect(formatWithUnit(1500000000, { units: customUnits })).toEqual({
      displayValue: "1.5G",
      unitSuffix: "G",
      unitIndex: 3,
    });
  });

  it("should cap at maximum unit", () => {
    // biome-ignore lint/correctness/noPrecisionLoss: Intentionally testing large numbers
    expect(formatWithUnit(999999999999999999)).toEqual({
      displayValue: "999T+",
      unitSuffix: "T",
      unitIndex: 4,
    });
  });

  it("should return 0 for non-positive or non-real numbers", () => {
    expect(formatWithUnit(-500)).toEqual({
      displayValue: "0",
      unitSuffix: "",
      unitIndex: 0,
    });
    expect(formatWithUnit(0)).toEqual({
      displayValue: "0",
      unitSuffix: "",
      unitIndex: 0,
    });
    expect(formatWithUnit(-1)).toEqual({
      displayValue: "0",
      unitSuffix: "",
      unitIndex: 0,
    });
    expect(formatWithUnit(NaN)).toEqual({
      displayValue: "0",
      unitSuffix: "",
      unitIndex: 0,
    });
  });

  it("should return 999T+ for Infinity", () => {
    expect(formatWithUnit(Infinity)).toEqual({
      displayValue: "999T+",
      unitSuffix: "T",
      unitIndex: 4,
    });
  });
});

describe("format", () => {
  it("should return just the display value string", () => {
    expect(format(123)).toBe("123");
    expect(format(1200)).toBe("1.2k");
    expect(format(132456455)).toBe("132M");
    expect(format(13245645512)).toBe("13B");
    expect(format(132456455123112)).toBe("132T");
  });

  it("should support options like formatWithUnit", () => {
    expect(
      format(132456455, {
        significantDigits: 9,
        decimalsPolicy: "always",
      }),
    ).toBe("132.456455M");

    const customUnits = ["", "K", "M", "G"];
    expect(format(1500, { units: customUnits })).toBe("1.5K");
  });
});
