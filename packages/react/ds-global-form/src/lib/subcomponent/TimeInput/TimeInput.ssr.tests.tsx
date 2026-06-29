import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimeInput } from "./TimeInput.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context.
describe("TimeInput (SSR)", () => {
  it("renders to static HTML with type=time", () => {
    const html = renderToString(<TimeInput name="meeting_time" step={900} />);
    expect(html).toContain('type="time"');
    expect(html).toContain('step="900"');
  });
});
