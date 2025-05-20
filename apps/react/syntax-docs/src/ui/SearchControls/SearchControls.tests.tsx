/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./SearchControls.js";

describe("SearchControls component", () => {
  it("renders", () => {
    render(<Component>SearchControls</Component>);
    expect(screen.getByText("SearchControls")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>SearchControls</Component>);
    expect(screen.getByText("SearchControls")).toHaveClass("test-class");
  });
});
