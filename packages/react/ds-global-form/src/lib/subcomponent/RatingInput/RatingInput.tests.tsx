import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RatingInput } from "./RatingInput.js";

describe("RatingInput", () => {
  it("renders a radiogroup with one radio per star", () => {
    render(<RatingInput name="rating" aria-label="Rate" count={5} />);
    const group = screen.getByRole("radiogroup", { name: "Rate" });
    expect(within(group).getAllByRole("radio")).toHaveLength(5);
  });

  it("offers ten radios for a ten-star scale", () => {
    render(<RatingInput name="rating" aria-label="Rate" count={10} />);
    expect(screen.getAllByRole("radio")).toHaveLength(10);
  });

  it("names each star for assistive technology", () => {
    render(<RatingInput name="rating" aria-label="Rate" count={5} />);
    expect(
      screen.getByRole("radio", { name: "3 of 5 stars" }),
    ).toBeInTheDocument();
  });

  it("emits the selected rating on change", () => {
    const onChange = vi.fn();
    render(
      <RatingInput
        name="rating"
        aria-label="Rate"
        count={5}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "4 of 5 stars" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("reflects a controlled value as the checked radio", () => {
    render(<RatingInput name="rating" aria-label="Rate" count={5} value={2} />);
    expect(screen.getByRole("radio", { name: "2 of 5 stars" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "3 of 5 stars" }),
    ).not.toBeChecked();
  });

  it("honours defaultValue when uncontrolled", () => {
    render(
      <RatingInput
        name="rating"
        aria-label="Rate"
        count={5}
        defaultValue={5}
      />,
    );
    expect(screen.getByRole("radio", { name: "5 of 5 stars" })).toBeChecked();
  });

  it("disables every radio when disabled", () => {
    render(<RatingInput name="rating" aria-label="Rate" count={5} disabled />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
  });

  describe("half stars", () => {
    it("offers twice as many steps in half increments", () => {
      render(
        <RatingInput name="rating" aria-label="Rate" count={5} allowHalf />,
      );
      expect(screen.getAllByRole("radio")).toHaveLength(10);
    });

    it("emits a half value when a half step is chosen", () => {
      const onChange = vi.fn();
      render(
        <RatingInput
          name="rating"
          aria-label="Rate"
          count={5}
          allowHalf
          onChange={onChange}
        />,
      );
      fireEvent.click(screen.getByRole("radio", { name: "2.5 of 5 stars" }));
      expect(onChange).toHaveBeenCalledWith(2.5);
    });
  });
});
