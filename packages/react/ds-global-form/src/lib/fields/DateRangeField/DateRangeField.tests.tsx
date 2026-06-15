import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { DateRangeField } from "./index.js";

describe("DateRangeField", () => {
  it("renders a labelled group with two date fields and a calendar toggle", () => {
    renderWithForm(
      <DateRangeField
        startName="arrival"
        endName="departure"
        label="Trip"
        startLabel="Arrival"
        endLabel="Departure"
      />,
    );
    expect(screen.getByRole("group", { name: /trip/i })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Arrival" })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Departure" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /calendar/i }),
    ).toBeInTheDocument();
  });

  it("reflects the two field values from the form", () => {
    renderWithForm(
      <DateRangeField
        startName="arrival"
        endName="departure"
        startLabel="Arrival"
        endLabel="Departure"
      />,
      {
        formProps: {
          defaultValues: { arrival: "2026-06-14", departure: "2026-06-20" },
        },
      },
    );
    expect(screen.getByRole("group", { name: "Arrival" })).toHaveTextContent(
      "2026",
    );
    expect(screen.getByRole("group", { name: "Departure" })).toHaveTextContent(
      "2026",
    );
  });

  it("rejects a departure before the arrival (cross-field validation)", async () => {
    renderWithForm(
      <>
        <DateRangeField
          startName="arrival"
          endName="departure"
          startLabel="Arrival"
          endLabel="Departure"
        />
        <button type="submit">Go</button>
      </>,
      {
        formProps: {
          mode: "onSubmit",
          defaultValues: { arrival: "2026-06-20", departure: "2026-06-14" },
        },
      },
    );
    fireEvent.click(screen.getByText("Go"));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/on or after/i);
    });
  });
});
