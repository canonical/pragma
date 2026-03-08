import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockTokens } from "../../../mockTokens.js";
import { TokenSwatch } from "./TokenSwatch.js";

type Token = (typeof mockTokens)[number];

describe("TokenSwatch", () => {
  it("renders a swatch for a color token", () => {
    const token = mockTokens.find((t) => t.type === "color") as Token;
    render(<TokenSwatch token={token} />);
    expect(screen.getByTitle(/color/i)).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const token = mockTokens.find((t) => t.type === "dimension") as Token;
    render(<TokenSwatch token={token} className="custom-class" />);
    const element = screen.getByTitle(/dimension/i);
    expect(element).toHaveClass("ds");
    expect(element).toHaveClass("token-swatch");
    expect(element).toHaveClass("custom-class");
  });

  it("passes through additional props", () => {
    const token = mockTokens.find((t) => t.type === "number") as Token;
    render(<TokenSwatch token={token} data-testid="test-component" />);
    expect(screen.getByTestId("test-component")).toBeInTheDocument();
  });
});
