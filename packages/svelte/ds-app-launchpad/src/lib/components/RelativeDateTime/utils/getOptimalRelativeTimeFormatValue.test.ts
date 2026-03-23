import { describe, expect, it } from "vitest";
import { getOptimalRelativeTimeFormatValue } from "./getOptimalRelativeTimeFormatValue.js";

describe("getOptimalRtfValue", () => {
  describe.each([
    ["for the future", 1],
    ["for the past", -1],
  ])("%s", (_, multiplier) => {
    describe("unit", () => {
      it("returns the largest unit that fits within the elapsed time", () => {
        const oneHour = 1000 * 60 * 60 * multiplier;
        let { unit } = getOptimalRelativeTimeFormatValue(oneHour);
        expect(unit).toBe("hour");

        const thirtyMinutes = 1000 * 60 * 30 * multiplier;
        ({ unit } = getOptimalRelativeTimeFormatValue(thirtyMinutes));
        expect(unit).toBe("minute");

        const fiveYears = 1000 * 60 * 60 * 24 * 365 * 5 * multiplier;
        ({ unit } = getOptimalRelativeTimeFormatValue(fiveYears));
        expect(unit).toBe("year");
      });

      it("returns the smallest unit if none fit within the elapsed time", () => {
        const halfSecond = 500 * multiplier;
        const { unit } = getOptimalRelativeTimeFormatValue(halfSecond);
        expect(unit).toBe("second");
      });
    });

    describe("value", () => {
      it("returns the number of largest fitting units within the elapsed time, preserving elapsed sign", () => {
        const threeHours = 1000 * 60 * 60 * 3 * multiplier;
        let { value } = getOptimalRelativeTimeFormatValue(threeHours);
        expect(value).toBe(3 * multiplier);

        const ninetyMinutes = 1000 * 60 * 90 * multiplier;
        ({ value } = getOptimalRelativeTimeFormatValue(ninetyMinutes));
        expect(value).toBe(1 * multiplier);

        const twoYears = 1000 * 60 * 60 * 24 * 365 * 2 * multiplier;
        ({ value } = getOptimalRelativeTimeFormatValue(twoYears));
        expect(value).toBe(2 * multiplier);
      });

      it("returns signed 0 for elapsed times smaller than the smallest unit", () => {
        const halfSecond = 500 * multiplier;
        const { value } = getOptimalRelativeTimeFormatValue(halfSecond);
        expect(value).toBe(0 * multiplier);
      });
    });

    describe("nextUpdateIn", () => {
      it("returns the milliseconds until the value would change", () => {
        const threeHours = 1000 * 60 * 60 * 3 * multiplier;
        let { nextUpdateIn } = getOptimalRelativeTimeFormatValue(threeHours);
        expect(nextUpdateIn).toBe(1000 * 60 * 60); // 1 hour

        const ninetyMinutes = 1000 * 60 * 90 * multiplier;
        ({ nextUpdateIn } = getOptimalRelativeTimeFormatValue(ninetyMinutes));
        expect(nextUpdateIn).toBe(1000 * 60 * 30); // 30 minutes

        const twoYears = 1000 * 60 * 60 * 24 * 365 * 2 * multiplier;
        ({ nextUpdateIn } = getOptimalRelativeTimeFormatValue(twoYears));
        expect(nextUpdateIn).toBe(1000 * 60 * 60 * 24 * 365); // 1 year

        const oneSecondAndHalf = 1500 * multiplier;
        ({ nextUpdateIn } =
          getOptimalRelativeTimeFormatValue(oneSecondAndHalf));
        expect(nextUpdateIn).toBe(500); // 0.5 second

        const tenMilliseconds = 10 * multiplier;
        ({ nextUpdateIn } = getOptimalRelativeTimeFormatValue(tenMilliseconds));
        expect(nextUpdateIn).toBe(990);
      });
    });
  });
});
