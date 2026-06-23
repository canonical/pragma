import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SimpleChoices } from "./SimpleChoices.js";

// Proves the presentational input renders to static HTML with no client
// runtime / form context — the server-rendered floor for progressive
// enhancement.
const options = [
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
];

describe("SimpleChoices (SSR)", () => {
  it("renders the fieldset and option inputs to static HTML", () => {
    const html = renderToString(
      <SimpleChoices name="color" options={options} />,
    );
    expect(html).toContain("<fieldset");
    expect(html).toContain("ds form-simple-choices");
    expect(html).toContain("<input");
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="color"');
    expect(html).toContain('value="red"');
  });

  it("renders checkbox inputs for the multiple variant", () => {
    const html = renderToString(
      <SimpleChoices name="colors" options={options} isMultiple />,
    );
    expect(html).toContain('type="checkbox"');
  });
});
