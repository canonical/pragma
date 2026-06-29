import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { TimeInput } from "./TimeInput.js";

// Renders the presentational input with NO FormProvider, proving it is usable
// standalone (outside of a <Form>).
describe("TimeInput (presentational)", () => {
  it("renders an input with type=time and forwards step", () => {
    render(<TimeInput name="meeting_time" step={900} />);
    const input = screen.getByDisplayValue("");
    expect(input).toHaveAttribute("type", "time");
    expect(input).toHaveAttribute("step", "900");
  });

  it("forwards a ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<TimeInput name="t" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
