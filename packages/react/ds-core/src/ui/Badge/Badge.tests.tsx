/* @canonical/generator-ds 0.10.0-experimental.2 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Badge.js";

describe("Badge component", () => {
  it("does not set an appearance by default", () => {
    render(<Component value={15} />);
    // Check that the element contains the default class.
    expect(screen.getByText("15")).toHaveClass("ds badge");
  });

  it("can set its appearance", () => {
    render(<Component value={15} appearance="negative" />);
    // Check that the element has the correct class.
    expect(screen.getByText("15")).toHaveClass("ds badge negative");
  });

  it("can set its type as undefined large number", () => {
    render(<Component value={1000} />);
    // Check that the correct value is displayed.
    expect(screen.getByText("999+")).toBeInTheDocument();
  });

  it("rounds number correctly for thousands", () => {
    render(<Component value={1200} overflowStrategy="compact" />);
    // Check that the correct value is displayed.
    expect(screen.getByText("1.2k")).toBeInTheDocument();
  });

  it("rounds number correctly for small values", () => {
    render(<Component value={999} overflowStrategy="compact" />);
    // Check that the correct value is displayed.
    expect(screen.getByText("999")).toBeInTheDocument();
  });

  it("rounds number correctly for millions", () => {
    render(<Component value={132456455} overflowStrategy="compact" />);
    // Check that the correct value is displayed.
    expect(screen.getByText("99M+")).toBeInTheDocument();
  });

  it("rounds number correctly for billions", () => {
    render(<Component value={13245645512} overflowStrategy="compact" />);
    // Check that the correct value is displayed.
    expect(screen.getByText("13B+")).toBeInTheDocument();
  });

  it("rounds number correctly for trillions", () => {
    render(<Component value={132456455123112} overflowStrategy="compact" />);
    // Check that the correct value is displayed.
    expect(screen.getByText("99T+")).toBeInTheDocument();
  });

  it("displays the correct max value if it exceeds 999T", () => {
    render(<Component value={1324564551231125} overflowStrategy="compact" />);
    // Check that the correct value is displayed.
    expect(screen.getByText("99T+")).toBeInTheDocument();
  });

  it("renders negative numbers as 0", () => {
    render(<Component value={-1} />);
    // Check that the correct value is displayed.
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders out-of-range values (999T+) as '999T+'", () => {
    render(<Component value={Infinity} />);
    // Check that the correct value is displayed.
    expect(screen.getByText("99T+")).toBeInTheDocument();
  });

  it("does not have aria-label when role is not defined", () => {
    render(<Component value={15} />);
    const badge = screen.getByText("15");
    expect(badge).not.toHaveAttribute("aria-label");
    expect(badge).not.toHaveAttribute("role");
  });

  it("has aria-label when role is defined", () => {
    render(<Component value={15} role="status" />);
    const badge = screen.getByText("15");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute("aria-label", "15 items exist");
  });

  it("has correct aria-label for compact precision with thousands", () => {
    render(<Component value={1200} overflowStrategy="compact" role="status" />);
    const badge = screen.getByText("1.2k");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute(
      "aria-label",
      "approximately 1.2 thousand items exist",
    );
  });

  it("has correct aria-label for compact precision with millions", () => {
    render(
      <Component value={132456455} overflowStrategy="compact" role="status" />,
    );
    const badge = screen.getByText("99M+");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute(
      "aria-label",
      "approximately 99+ million items exist",
    );
  });

  it("has correct aria-label for compact precision with billions", () => {
    render(
      <Component
        value={13245645512}
        overflowStrategy="compact"
        role="status"
      />,
    );
    const badge = screen.getByText("13B+");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute(
      "aria-label",
      "approximately 13+ billion items exist",
    );
  });

  it("has correct aria-label for compact precision with trillions", () => {
    render(
      <Component
        value={132456455123112}
        overflowStrategy="compact"
        role="status"
      />,
    );
    const badge = screen.getByText("99T+");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute(
      "aria-label",
      "approximately 99+ trillion items exist",
    );
  });

  it("has correct aria-label for large numbers without compact precision", () => {
    render(<Component value={1000} role="status" />);
    const badge = screen.getByText("999+");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute("aria-label", "more than 999 items exist");
  });

  it("has correct aria-label for small numbers with compact precision", () => {
    render(<Component value={999} overflowStrategy="compact" role="status" />);
    const badge = screen.getByText("999");
    expect(badge).toHaveAttribute("role", "status");
    expect(badge).toHaveAttribute("aria-label", "999 items exist");
  });
});
