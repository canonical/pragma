/* @canonical/generator-ds 0.9.0-experimental.9 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Error.js";

describe("Error component", () => {
  it("renders", () => {
    render(<Component>Error</Component>);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Error</Component>);
    expect(screen.getByText("Error")).toHaveClass("test-class");
  });
});
