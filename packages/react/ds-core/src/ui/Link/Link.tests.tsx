/* @canonical/generator-ds 0.10.0-experimental.2 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Link.js";

describe("Link component", () => {
  it("renders", () => {
    render(<Component>Link</Component>);
    expect(screen.getByText("Link")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>Link</Component>);
    expect(screen.getByText("Link")).toHaveClass("test-class");
  });

  describe("activationContents", () => {
    it("applies soft classname", () => {
      render(
        <Component activationContents={<span>Lorem ipsum</span>}>
          Link
        </Component>,
      );
      expect(screen.getByText("Link")).toHaveClass("soft");
    });
  });
});
