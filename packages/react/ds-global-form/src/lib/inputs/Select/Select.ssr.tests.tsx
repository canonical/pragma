import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select } from "./Select.js";

const options = [
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
];

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
describe("Select (SSR)", () => {
  it("renders to static HTML without a form context", () => {
    const html = renderToString(<Select name="color" options={options} />);
    expect(html).toContain("<select");
    expect(html).toContain('name="color"');
    expect(html).toContain("ds input select chrome");
  });

  it("includes the options in the SSR output", () => {
    const html = renderToString(<Select name="color" options={options} />);
    expect(html).toContain('value="red"');
    expect(html).toContain("Red");
    expect(html).toContain('value="blue"');
    expect(html).toContain("Blue");
    expect(html).toContain('value="green"');
    expect(html).toContain("Green");
  });
});
