/* @canonical/generator-ds 0.9.0-experimental.9 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./ExampleComponent.js";

describe("ExampleComponent component", () => {
  it("renders", () => {
    render(<Component>ExampleComponent</Component>);
    expect(screen.getByText("ExampleComponent")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>ExampleComponent</Component>);
    expect(screen.getByText("ExampleComponent")).toHaveClass("test-class");
  });
});
