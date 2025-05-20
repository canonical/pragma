/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Content.js";

describe("Content component", () => {
  it("renders", () => {
    render(<Component>Content</Component>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Content</Component>);
    expect(screen.getByText("Content")).toHaveClass("test-class");
  });
});