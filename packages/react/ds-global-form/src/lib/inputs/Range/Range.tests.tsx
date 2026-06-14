import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Range } from "./Range.js";

describe("Range (presentational)", () => {
  it("renders a slider without a form context", () => {
    render(<Range name="volume" min={0} max={100} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("renders an output reflecting the value prop", () => {
    render(<Range name="volume" min={0} max={100} value={42} readOnly />);
    expect(screen.getByRole("status")).toHaveTextContent("42");
  });

  it("respects min and max", () => {
    render(<Range name="volume" min={0} max={100} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
  });

  it("forwards a ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Range name="v" min={0} max={10} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
