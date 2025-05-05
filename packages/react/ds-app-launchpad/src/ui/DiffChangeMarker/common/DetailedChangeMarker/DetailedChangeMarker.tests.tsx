/* @canonical/generator-ds 0.9.0-experimental.12 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./DetailedChangeMarker.js";

describe("DetailedChangeMarker component", () => {
  it("renders", () => {
    const { container } = render(
      <Component added="1" deleted="1" modified="1" />,
    );
    expect(container.querySelector(".added")).toBeInTheDocument();
    expect(container.querySelector(".deleted")).toBeInTheDocument();
    expect(container.querySelector(".modified")).toBeInTheDocument();
  });
  it("applies className", () => {
    const { container } = render(<Component className={"test-class"} />);
    expect(container.querySelector(".detailed-change-marker")).toHaveClass(
      "test-class",
    );
  });
});
