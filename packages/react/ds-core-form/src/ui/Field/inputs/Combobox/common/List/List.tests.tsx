/* @canonical/generator-ds 0.9.0-experimental.9 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./List.js";

describe("List component", () => {
  it("renders", () => {
    render(<Component>List</Component>);
    expect(screen.getByText('List')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>List</Component>);
    expect(screen.getByText("List")).toHaveClass("test-class");
  });
});