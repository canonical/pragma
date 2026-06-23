import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Hidden } from "./Hidden.js";

describe("Hidden (presentational)", () => {
  it("renders a hidden input without a form context", () => {
    const { container } = render(<Hidden name="secret" />);
    expect(container.querySelector('input[type="hidden"]')).toBeInTheDocument();
  });

  it("passes through name and value", () => {
    const { container } = render(<Hidden name="secret" value="v" readOnly />);
    const input = container.querySelector('input[type="hidden"]');
    expect(input).toHaveAttribute("name", "secret");
    expect(input).toHaveValue("v");
  });

  it("forwards a ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Hidden name="s" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
