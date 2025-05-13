/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./LoginCard.js";

describe("LoginCard component", () => {
  it("renders", () => {
    render(<Component>LoginCard</Component>);
    expect(screen.getByText('LoginCard')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>LoginCard</Component>);
    expect(screen.getByText("LoginCard")).toHaveClass("test-class");
  });
});