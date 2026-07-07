import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { RatingField } from "./index.js";

describe("RatingField", () => {
  it("renders a rating radiogroup with the field label", () => {
    renderWithForm(<RatingField name="score" label="Rate" count={5} />);
    expect(
      screen.getByRole("radiogroup", { name: "Rate" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("registers the selected rating with react-hook-form", () => {
    renderWithForm(<RatingField name="score" label="Rate" count={5} />);
    fireEvent.click(screen.getByRole("radio", { name: "4 of 5 stars" }));
    expect(screen.getByRole("radio", { name: "4 of 5 stars" })).toBeChecked();
  });

  it("reflects a default rating from form defaultValues", () => {
    renderWithForm(<RatingField name="score" label="Rate" count={5} />, {
      formProps: { defaultValues: { score: 3 } },
    });
    expect(screen.getByRole("radio", { name: "3 of 5 stars" })).toBeChecked();
  });

  // The Field router dispatch (`<Field inputType="rating" />`) is type-checked
  // by the discriminated FieldProps union; a runtime test is omitted here
  // because importing the Field router pulls in ds-global (via ResetButton),
  // whose src currently fails to resolve `@canonical/react-hooks` on main.
});
