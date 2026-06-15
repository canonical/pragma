import { CalendarDate } from "@internationalized/date";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RangeCalendar } from "./RangeCalendar.js";

const noop = () => {};
const RANGE = {
  start: new CalendarDate(2026, 6, 10),
  end: new CalendarDate(2026, 6, 14),
};

// Proves the range calendar renders to static HTML with no client runtime — the
// server-rendered floor for progressive enhancement.
describe("RangeCalendar (SSR)", () => {
  it("renders a grid to static HTML", () => {
    const html = renderToString(
      <RangeCalendar value={RANGE} onChange={noop} locale="en-US" />,
    );
    expect(html).toContain('role="grid"');
    expect(html).toContain('aria-multiselectable="true"');
    expect(html).toContain('aria-label="June 2026"');
    expect(html).toContain("ds calendar range-calendar");
  });

  it("includes the day gridcells and the range endpoints in the SSR output", () => {
    const html = renderToString(
      <RangeCalendar value={RANGE} onChange={noop} locale="en-US" />,
    );
    expect(html).toContain('role="gridcell"');
    expect(html).toContain('role="columnheader"');
    expect(html).toContain('data-range-start="true"');
    expect(html).toContain('data-range-end="true"');
    // The full accessible label for the range start is present in the markup.
    expect(html).toContain("Wednesday, June 10, 2026");
  });
});
