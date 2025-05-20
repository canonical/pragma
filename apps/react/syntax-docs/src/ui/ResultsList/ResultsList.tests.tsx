/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./ResultsList.js";

describe("ResultsList component", () => {
  it("renders", () => {
    render(<Component>ResultsList</Component>);
    expect(screen.getByText("ResultsList")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>ResultsList</Component>);
    expect(screen.getByText("ResultsList")).toHaveClass("test-class");
  });
});
