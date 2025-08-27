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
    render(<Component value={132_456_455} overflowStrategy="compact" />);
    // Check that the correct value is displayed.
    expect(screen.getByText("99M+")).toBeInTheDocument();
  });

  it("rounds number correctly for billions", () => {
    render(<Component value={13_245_645_512} overflowStrategy="compact" />);
    // Check that the correct value is displayed.
    expect(screen.getByText("13B+")).toBeInTheDocument();
  });

  it("rounds number correctly for trillions", () => {
    render(
      <Component value={132_456_455_123_112} overflowStrategy="compact" />,
    );
    // Check that the correct value is displayed.
    expect(screen.getByText("99T+")).toBeInTheDocument();
  });

  it("displays the correct max value if it exceeds 999T", () => {
    render(
      <Component value={1_324_564_551_231_125} overflowStrategy="compact" />,
    );
    // Check that the correct value is displayed.
    expect(screen.getByText("99T+")).toBeInTheDocument();
  });

  it("renders negative numbers as 0", () => {
    render(<Component value={-1} />);
    // Check that the correct value is displayed.
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders out-of-range values with 999+'", () => {
    render(<Component value={Infinity} />);
    // Check that the correct value is displayed.
    expect(screen.getByText("999+")).toBeInTheDocument();
  });
});
