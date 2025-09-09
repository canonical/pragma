/* @canonical/generator-ds 0.10.0-experimental.2 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Badge.js";

describe("Badge component", () => {
  it("does not set an appearance by default", () => {
    render(<Component value={15} />);
    expect(screen.getByText("15")).toHaveClass("ds badge");
  });

  it("can set its appearance", () => {
    render(<Component value={15} appearance="negative" />);
    expect(screen.getByText("15")).toHaveClass("ds badge negative");
  });

  it("displays exact truncated values for exactly representable values at or above the magnitude base", () => {
    render(<Component value={1000} />);
    expect(screen.getByText("1k")).toBeInTheDocument();
  });

  it("displays exact as-is values for exactly representable values below the magnitude base", () => {
    render(<Component value={999} />);
    expect(screen.getByText("999")).toBeInTheDocument();
  });

  it("truncates millions", () => {
    render(<Component value={132_456_455} />);
    expect(screen.getByText("132M+")).toBeInTheDocument();
  });

  it("truncates billions", () => {
    render(<Component value={13_245_645_512} />);
    expect(screen.getByText("13B+")).toBeInTheDocument();
  });

  it("truncates trillions", () => {
    render(<Component value={132_456_455_123_112} />);
    expect(screen.getByText("132T+")).toBeInTheDocument();
  });

  it("truncates values above the highest provided unit by showing `magnitudeBase - 1` followed by an overflow indicator", () => {
    render(<Component value={1_324_564_551_231_125} />);
    expect(screen.getByText("999T+")).toBeInTheDocument();
  });

  // TODO this would be changed to display 0 if we implement clamping as in RC
  it("renders negative numbers as-is", () => {
    render(<Component value={-1} />);
    expect(screen.getByText("-1")).toBeInTheDocument();
  });

  it("renders out-of-range values with infinity symbol", () => {
    render(<Component value={Infinity} />);
    expect(screen.getByText("∞")).toBeInTheDocument();
  });

  it("supports custom units", () => {
    render(
      <Component
        value={2048}
        humanizeOptions={{
          magnitudeBase: 1024,
          units: ["B", "KiB", "MiB"],
        }}
      />,
    );
    expect(screen.getByText("2KiB")).toBeInTheDocument();
  });

  it("supports custom overflow indicator", () => {
    render(
      <Component
        value={1501}
        humanizeOptions={{
          overflowIndicator: "++",
        }}
      />,
    );
    expect(screen.getByText("1.5k++")).toBeInTheDocument();
  });
});
