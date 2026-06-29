import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DateTimeInput } from "./DateTimeInput.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context.
describe("DateTimeInput (SSR)", () => {
  it("renders to static HTML with type=datetime-local", () => {
    const html = renderToString(<DateTimeInput name="event_datetime" />);
    expect(html).toContain('type="datetime-local"');
  });
});
