import { CalendarDate } from "@internationalized/date";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Calendar } from "./Calendar.js";

const noop = () => {};
const JUNE_15 = new CalendarDate(2026, 6, 15);

// Proves the calendar renders to static HTML with no client runtime — the
// server-rendered floor for progressive enhancement.
describe("Calendar (SSR)", () => {
  it("renders a grid to static HTML", () => {
    const html = renderToString(
      <Calendar value={JUNE_15} onChange={noop} locale="en-US" />,
    );
    expect(html).toContain('role="grid"');
    expect(html).toContain('aria-label="June 2026"');
    expect(html).toContain("ds calendar");
  });

  it("includes the day gridcells in the SSR output", () => {
    const html = renderToString(
      <Calendar value={JUNE_15} onChange={noop} locale="en-US" />,
    );
    expect(html).toContain('role="gridcell"');
    expect(html).toContain('role="columnheader"');
    // The full accessible label for the 15th is present in the markup.
    expect(html).toContain("Monday, June 15, 2026");
  });
});
