import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RatingInput } from "./RatingInput.js";

describe("RatingInput SSR", () => {
  it("doesn't throw", () => {
    expect(() => {
      renderToString(<RatingInput name="rating" aria-label="Rate" />);
    }).not.toThrow();
  });

  it("renders a radiogroup with the star radios", () => {
    const html = renderToString(
      <RatingInput name="rating" aria-label="Rate" count={5} />,
    );
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('type="radio"');
    expect(html).toContain("form-rating");
  });
});
