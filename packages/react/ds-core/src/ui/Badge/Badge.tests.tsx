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

  it("uses default clamp mode when empty options provided", () => {
    render(<Component value={1200} humanizeOptions={{}} />);
    // Check that the default clamp behavior is used
    expect(screen.getByText("999+")).toBeInTheDocument();
  });

  it("uses default clamp mode for small values", () => {
    render(<Component value={999} humanizeOptions={{}} />);
    // Check that the correct value is displayed.
    expect(screen.getByText("999")).toBeInTheDocument();
  });

  it("uses default clamp mode for millions", () => {
    render(<Component value={132_456_455} humanizeOptions={{}} />);
    // Check that the default clamp behavior is used
    expect(screen.getByText("999+")).toBeInTheDocument();
  });

  it("uses default clamp mode for billions", () => {
    render(<Component value={13_245_645_512} humanizeOptions={{}} />);
    // Check that the default clamp behavior is used
    expect(screen.getByText("999+")).toBeInTheDocument();
  });

  it("uses default clamp mode for trillions", () => {
    render(<Component value={132_456_455_123_112} humanizeOptions={{}} />);
    // Check that the default clamp behavior is used
    expect(screen.getByText("999+")).toBeInTheDocument();
  });

  it("uses default clamp mode for extremely large values", () => {
    render(<Component value={1_324_564_551_231_125} humanizeOptions={{}} />);
    // Check that the default clamp behavior is used
    expect(screen.getByText("999+")).toBeInTheDocument();
  });

  it("renders negative numbers as floored value", () => {
    render(<Component value={-1} />);
    // Check that the correct value is displayed.
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders out-of-range values with infinity symbol", () => {
    render(<Component value={Infinity} />);
    // Check that the correct value is displayed.
    expect(screen.getByText("∞")).toBeInTheDocument();
  });

  it("supports custom clamp options", () => {
    render(
      <Component
        value={1500}
        humanizeOptions={{
          humanizeType: "clamp",
          clampOptions: { max: 999 },
          overflowIndicator: "+",
        }}
      />,
    );
    // Check that the value is clamped to 999 with overflow indicator
    expect(screen.getByText("999+")).toBeInTheDocument();
  });

  it("supports custom units", () => {
    render(
      <Component
        value={2048}
        humanizeOptions={{
          humanizeType: "round",
          magnitudeBase: 1024,
          units: ["B", "KiB", "MiB"],
        }}
      />,
    );
    // Check that the value uses custom binary units
    expect(screen.getByText("2KiB")).toBeInTheDocument();
  });

  it("supports custom overflow indicator", () => {
    render(
      <Component
        value={1500}
        humanizeOptions={{
          humanizeType: "clamp",
          clampOptions: { max: 999 },
          overflowIndicator: "++",
        }}
      />,
    );
    // Check that the custom overflow indicator is used
    expect(screen.getByText("999++")).toBeInTheDocument();
  });

  it("supports partial configuration overrides", () => {
    render(
      <Component
        value={1500}
        humanizeOptions={{
          overflowIndicator: "++",
        }}
      />,
    );
    // Check that only the overflow indicator is overridden, other defaults remain
    expect(screen.getByText("999++")).toBeInTheDocument();
  });

  it("supports overriding clamp max value", () => {
    render(
      <Component
        value={500}
        humanizeOptions={{
          clampOptions: { max: 100 },
        }}
      />,
    );
    // Check that the custom max value is used
    expect(screen.getByText("100+")).toBeInTheDocument();
  });

  it("supports switching to round mode", () => {
    render(
      <Component
        value={1500}
        humanizeOptions={{
          humanizeType: "round",
        }}
      />,
    );
    // Check that round mode is used instead of default clamp mode
    expect(screen.getByText("1.5k")).toBeInTheDocument();
  });
});
