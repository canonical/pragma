/* @canonical/generator-ds 0.9.0-experimental.12 */

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./SimpleChangeMarker.js";

describe("SimpleChangeMarker component", () => {
  it("renders", () => {
    const { container } = render(<Component changeType="added" />);
    expect(container.querySelector(".simple-change-marker")).toHaveClass(
      "added",
    );
  });

  it("applies className", () => {
    const { container } = render(
      <Component changeType="added" className={"test-class"} />,
    );
    expect(container.querySelector(".simple-change-marker")).toHaveClass(
      "test-class",
    );
  });
});
