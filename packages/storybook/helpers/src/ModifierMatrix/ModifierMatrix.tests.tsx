import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModifierMatrix } from "./ModifierMatrix.js";

const TestComponent = ({ importance, anticipation, children }: {
  importance?: string;
  anticipation?: string;
  children?: React.ReactNode;
}) => (
  <button data-importance={importance} data-anticipation={anticipation}>
    {children}
  </button>
);

const rowAxis = {
  name: "Importance",
  prop: "importance" as const,
  values: ["primary", "secondary"] as const,
};

const columnAxis = {
  name: "Anticipation",
  prop: "anticipation" as const,
  values: ["constructive", "destructive"] as const,
};

describe("ModifierMatrix", () => {
  it("renders a table with row and column headers", () => {
    render(
      <ModifierMatrix
        component={TestComponent}
        rowAxis={rowAxis}
        columnAxis={columnAxis}
        baseProps={{ children: "Click" }}
      />,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Importance")).toBeInTheDocument();
    expect(screen.getByText("Anticipation")).toBeInTheDocument();
  });

  it("renders axis values as headers", () => {
    render(
      <ModifierMatrix
        component={TestComponent}
        rowAxis={rowAxis}
        columnAxis={columnAxis}
        baseProps={{ children: "Click" }}
        includeNone={false}
      />,
    );
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Secondary")).toBeInTheDocument();
    expect(screen.getByText("Constructive")).toBeInTheDocument();
    expect(screen.getByText("Destructive")).toBeInTheDocument();
  });

  it("includes Default row/column when includeNone is true", () => {
    render(
      <ModifierMatrix
        component={TestComponent}
        rowAxis={rowAxis}
        columnAxis={columnAxis}
        baseProps={{ children: "Click" }}
        includeNone={true}
      />,
    );
    const defaults = screen.getAllByText("Default");
    expect(defaults.length).toBe(2);
  });

  it("uses custom noneLabel", () => {
    render(
      <ModifierMatrix
        component={TestComponent}
        rowAxis={rowAxis}
        columnAxis={columnAxis}
        baseProps={{ children: "Click" }}
        includeNone={true}
        noneLabel="None"
      />,
    );
    const nones = screen.getAllByText("None");
    expect(nones.length).toBe(2);
  });

  it("renders components in cells", () => {
    render(
      <ModifierMatrix
        component={TestComponent}
        rowAxis={rowAxis}
        columnAxis={columnAxis}
        baseProps={{ children: "Click" }}
        includeNone={false}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(4); // 2 rows x 2 cols
  });

  it("passes correct props to cell components", () => {
    render(
      <ModifierMatrix
        component={TestComponent}
        rowAxis={rowAxis}
        columnAxis={columnAxis}
        baseProps={{ children: "Click" }}
        includeNone={false}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("data-importance", "primary");
    expect(buttons[0]).toHaveAttribute("data-anticipation", "constructive");
  });

  it("renders title when provided", () => {
    render(
      <ModifierMatrix
        component={TestComponent}
        rowAxis={rowAxis}
        columnAxis={columnAxis}
        baseProps={{ children: "Click" }}
        title="Button Variants"
      />,
    );
    expect(screen.getByText("Button Variants")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ModifierMatrix
        component={TestComponent}
        rowAxis={rowAxis}
        columnAxis={columnAxis}
        baseProps={{ children: "Click" }}
        className="custom-matrix"
      />,
    );
    expect(container.querySelector(".modifier-matrix")).toHaveClass("custom-matrix");
  });

  it("uses custom labels when provided", () => {
    render(
      <ModifierMatrix
        component={TestComponent}
        rowAxis={{
          ...rowAxis,
          labels: { primary: "Main", secondary: "Alt" },
        }}
        columnAxis={columnAxis}
        baseProps={{ children: "Click" }}
        includeNone={false}
      />,
    );
    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByText("Alt")).toBeInTheDocument();
  });

  it("supports custom renderCell function", () => {
    render(
      <ModifierMatrix
        component={TestComponent}
        rowAxis={rowAxis}
        columnAxis={columnAxis}
        baseProps={{ children: "Click" }}
        includeNone={false}
        renderCell={({ rowValue, colValue }) => (
          <span data-testid="custom-cell">{`${rowValue}-${colValue}`}</span>
        )}
      />,
    );
    const cells = screen.getAllByTestId("custom-cell");
    expect(cells.length).toBe(4);
    expect(cells[0]).toHaveTextContent("primary-constructive");
  });
});
