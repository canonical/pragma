import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { DateTimeInput } from "./DateTimeInput.js";

// Renders the presentational input with NO FormProvider, proving it is usable
// standalone (outside of a <Form>).
describe("DateTimeInput (presentational)", () => {
  it("renders an input with type=datetime-local", () => {
    render(<DateTimeInput name="event_datetime" />);
    expect(screen.getByDisplayValue("")).toHaveAttribute(
      "type",
      "datetime-local",
    );
  });

  it("forwards a ref to the underlying input", () => {
    const ref = createRef<HTMLInputElement>();
    render(<DateTimeInput name="dt" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
