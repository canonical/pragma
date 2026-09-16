import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RangeDrawing from "./RangeDrawing.js";

/** Where each marker is drawn along the axis, in the drawing's units. */
const readMarkers = (container: HTMLElement): readonly number[] =>
  [...container.querySelectorAll(".marker")].map((marker) =>
    Number(marker.getAttribute("cx")),
  );

describe("RangeDrawing", () => {
  it("draws the range as a band between its two ends", () => {
    const { container } = render(
      <RangeDrawing
        label="Cores"
        min={1}
        max={12}
        lowerBound={0}
        upperBound={undefined}
      />,
    );
    expect(
      [...container.querySelectorAll(".tick")].map((tick) => tick.textContent),
    ).toEqual(["0", "5", "10", "15"]);
    const [lowest, highest] = readMarkers(container);
    expect(lowest).toBeCloseTo(24 + (1 / 15) * 432);
    expect(highest).toBeCloseTo(24 + (12 / 15) * 432);
    expect(
      Number(container.querySelector(".band")?.getAttribute("width")),
    ).toBeCloseTo((11 / 15) * 432);
    // Neither end is near an edge, so each label sits on the inside of its
    // marker: the collision anchors are the other case, below.
    expect(
      [...container.querySelectorAll(".value")].map((label) =>
        label.getAttribute("text-anchor"),
      ),
    ).toEqual(["end", "start"]);
  });

  it("is an image named with its range, beside a table of both values", () => {
    render(
      <RangeDrawing
        label="Cores"
        min={3}
        max={12}
        lowerBound={undefined}
        upperBound={undefined}
      />,
    );
    expect(
      screen.getByRole("img", { name: "Cores: a range chart from 3 to 12" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("table", { name: "Cores, as a table" }))
        .getAllByRole("row")
        .map((row) =>
          [...row.querySelectorAll("th, td")].map((cell) => cell.textContent),
        ),
    ).toEqual([
      ["Lowest", "3"],
      ["Highest", "12"],
    ]);
  });

  it("reaches a declared upper bound past the range", () => {
    const { container } = render(
      <RangeDrawing
        label="Memory"
        min={4}
        max={12}
        lowerBound={undefined}
        upperBound={64}
      />,
    );
    expect(
      [...container.querySelectorAll(".tick")].map((tick) => tick.textContent),
    ).toEqual(["0", "20", "40", "60", "80"]);
  });

  it("anchors an end label that would run off the axis the other way", () => {
    const { container } = render(
      <RangeDrawing
        label="Cores"
        min={0}
        max={100}
        lowerBound={0}
        upperBound={100}
      />,
    );
    const labels = [...container.querySelectorAll(".value")];
    expect(labels.at(0)).toHaveAttribute("text-anchor", "start");
    expect(labels.at(1)).toHaveAttribute("text-anchor", "end");
  });
});
