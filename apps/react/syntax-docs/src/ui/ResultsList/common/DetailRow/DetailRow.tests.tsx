/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./DetailRow.js";

describe("DetailRow component", () => {
  it("renders", () => {
    render(<Component>DetailRow</Component>);
    expect(screen.getByText('DetailRow')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>DetailRow</Component>);
    expect(screen.getByText("DetailRow")).toHaveClass("test-class");
  });
});