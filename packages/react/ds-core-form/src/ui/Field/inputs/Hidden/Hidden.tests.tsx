/* @canonical/generator-ds 0.9.0-experimental.9 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Hidden.js";

describe("Hidden component", () => {
  it("renders a hidden input", () => {
    const { container } = render(<Component name="hidden_field" />);
    const input = container.querySelector('input[type="hidden"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("name", "hidden_field");
  });
});
