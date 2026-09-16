import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BarDrawing from "./BarDrawing.js";
import type { DrawnValue } from "./types.js";

/** Two values, counted exactly. */
const counted: readonly DrawnValue[] = [
  { value: "failed", count: { kind: "exact", value: 4 } },
  { value: "running", count: { kind: "exact", value: 8 } },
];

/** Each bar's drawn data end, as the `H` its path draws its top edge to. */
const readBarEnds = (container: HTMLElement): readonly string[] =>
  [...container.querySelectorAll(".bar")].map(
    (bar) =>
      bar
        .getAttribute("d")
        ?.match(/H([\d.]+)/)
        ?.at(1) ?? "",
  );

describe("BarDrawing", () => {
  it("draws one bar per value, scaled to the axis it steps out", () => {
    const { container } = render(
      <BarDrawing label="Machines by status" values={counted} />,
    );
    // Eight ends the axis: 264 units of plot past the 136-unit label column,
    // less the 4-unit rounded end; four is half of it.
    expect(readBarEnds(container)).toEqual(["264", "396"]);
    expect(
      [...container.querySelectorAll(".tick")].map((tick) => tick.textContent),
    ).toEqual(["0", "2", "4", "6", "8"]);
  });

  it("is an image named for what it shows", () => {
    render(<BarDrawing label="Machines by status" values={counted} />);
    expect(
      screen.getByRole("img", {
        name: "Machines by status: a bar chart of how many records hold each value",
      }).tagName,
    ).toBe("svg");
  });

  it("holds every value and count in a table of its own", () => {
    render(<BarDrawing label="Machines by status" values={counted} />);
    const table = screen.getByRole("table", {
      name: "Machines by status, as a table",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Value", "Count"]);
    expect(
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) =>
          [...row.querySelectorAll("th, td")].map((cell) => cell.textContent),
        ),
    ).toEqual([
      ["failed", "4"],
      ["running", "8"],
    ]);
  });

  it("says a lower bound as one, and draws no bar for a count the source did not take", () => {
    const { container } = render(
      <BarDrawing
        label="Machines by status"
        values={[
          { value: "failed", count: { kind: "at-least", value: 3 } },
          { value: "running", count: { kind: "unknown" } },
        ]}
      />,
    );
    expect(
      [...container.querySelectorAll(".value")].map(
        (value) => value.textContent,
      ),
    ).toEqual(["at least 3", "Not counted"]);
    expect(container.querySelectorAll(".bar")).toHaveLength(1);
  });
});
