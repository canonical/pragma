/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Label.js";

describe("Label component", () => {
  it("renders", () => {
    render(<Component name="Email">Email</Component>);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("applies className", () => {
    render(
      <Component className={"test-class"} name="Email">
        Email
      </Component>,
    );
    expect(screen.getByText("Email")).toHaveClass("test-class");
  });

  it("marks required fields (default mode) via data-required, not label text", () => {
    render(<Component name="Email">Email</Component>);
    const label = screen.getByText("Email");
    // The "*" is a CSS ::before, so the accessible/queryable text is unchanged.
    expect(label).toHaveAttribute("data-required");
    expect(label).toHaveTextContent("Email");
  });

  it("does NOT mark optional fields in the default (required) mode", () => {
    render(
      <Component name="Email" isOptional>
        Email
      </Component>,
    );
    const label = screen.getByText("Email");
    expect(label).not.toHaveAttribute("data-required");
    expect(label).not.toHaveTextContent(/optional/i);
  });

  it("shows the (optional) suffix only in optional-marking mode", () => {
    render(
      <Component name="Email" isOptional requiredIndicator="optional">
        Email
      </Component>,
    );
    const label = screen.getByText(/Email/);
    // No required marker in optional mode; the suffix is real, queryable text.
    expect(label).not.toHaveAttribute("data-required");
    expect(label).toHaveTextContent(/optional/i);
  });

  it("does not mark a required field in optional-marking mode", () => {
    render(
      <Component name="Email" requiredIndicator="optional">
        Email
      </Component>,
    );
    const label = screen.getByText("Email");
    expect(label).not.toHaveAttribute("data-required");
    expect(label).not.toHaveTextContent(/optional/i);
  });
});
