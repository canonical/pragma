import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DatePicker } from "./DatePicker.js";

describe("DatePicker (SSR)", () => {
  it("renders the field group + toggle to static HTML (no client runtime)", () => {
    const html = renderToString(
      <DatePicker value="2026-06-14" onChange={() => {}} />,
    );
    expect(html).toContain('role="group"');
    expect(html).toContain("date-picker");
    expect(html).toContain("2026");
  });
});
