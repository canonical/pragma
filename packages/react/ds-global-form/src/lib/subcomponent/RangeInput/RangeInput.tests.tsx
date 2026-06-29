import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { RangeInput } from "./RangeInput.js";

describe("RangeInput (presentational)", () => {
  it("renders a slider without a form context", () => {
    render(<RangeInput name="volume" min={0} max={100} />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("renders an output reflecting the value prop", () => {
    render(<RangeInput name="volume" min={0} max={100} value={42} readOnly />);
    expect(screen.getByRole("status")).toHaveTextContent("42");
  });

  it("respects min and max", () => {
    render(<RangeInput name="volume" min={0} max={100} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
  });

  it("forwards a ref to the input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<RangeInput name="v" min={0} max={10} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
