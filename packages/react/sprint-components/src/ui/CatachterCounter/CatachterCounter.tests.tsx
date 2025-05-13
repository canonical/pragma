/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./CatachterCounter.js";

describe("CatachterCounter component", () => {
  it("renders", () => {
    render(<Component>CatachterCounter</Component>);
    expect(screen.getByText('CatachterCounter')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>CatachterCounter</Component>);
    expect(screen.getByText("CatachterCounter")).toHaveClass("test-class");
  });
});