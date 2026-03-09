import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockTokens } from "../mockTokens.js";
import { TokenTable } from "./TokenTable.js";

describe("TokenTable", () => {
  it("renders token rows", () => {
    render(<TokenTable tokens={mockTokens.slice(0, 2)} title="Test content" />);
    expect(screen.getByText("Test content")).toBeInTheDocument();
    expect(screen.getByText(mockTokens[0].cssVar)).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <TokenTable tokens={mockTokens.slice(0, 1)} className="custom-class" />,
    );
    const element = screen.getByRole("table").parentElement?.parentElement;
    expect(element).toHaveClass("ds");
    expect(element).toHaveClass("token-table");
    expect(element).toHaveClass("custom-class");
  });

  it("passes through additional props", () => {
    render(
      <TokenTable
        tokens={mockTokens.slice(0, 1)}
        data-testid="test-component"
      />,
    );
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });
});
