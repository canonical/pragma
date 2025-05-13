/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Spinner.js";

describe("Spinner component", () => {
  it("renders", () => {
    render(<Component>Spinner</Component>);
    expect(screen.getByText('Spinner')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Spinner</Component>);
    expect(screen.getByText("Spinner")).toHaveClass("test-class");
  });
});