import { CalendarDate } from "@internationalized/date";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DateField } from "./DateField.js";

describe("DateField (SSR)", () => {
  it("renders the group and spinbutton roles to static HTML", () => {
    const html = renderToString(
      <DateField value={null} onChange={() => {}} locale="en-US" />,
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('role="spinbutton"');
    // Three editable segments are present.
    expect(html.match(/role="spinbutton"/g) ?? []).toHaveLength(3);
    expect(html).toContain('aria-label="Month"');
    expect(html).toContain('aria-label="Day"');
    expect(html).toContain('aria-label="Year"');
    // Placeholders for an unset value.
    expect(html).toContain("mm");
    expect(html).toContain("yyyy");
  });

  it("renders the controlled value to static HTML", () => {
    const html = renderToString(
      <DateField
        value={new CalendarDate(2024, 6, 14)}
        onChange={() => {}}
        locale="en-US"
      />,
    );
    expect(html).toContain('aria-valuenow="6"');
    expect(html).toContain("2024");
  });
});
