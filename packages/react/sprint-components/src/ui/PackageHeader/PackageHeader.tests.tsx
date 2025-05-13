/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./PackageHeader.js";

describe("PackageHeader component", () => {
  it("renders", () => {
    render(<Component>PackageHeader</Component>);
    expect(screen.getByText('PackageHeader')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>PackageHeader</Component>);
    expect(screen.getByText("PackageHeader")).toHaveClass("test-class");
  });
});