/* @canonical/generator-ds 0.9.0-experimental.20 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./QuadstoreProvider.js";

describe("QuadstoreProvider component", () => {
  it("renders", () => {
    render(<Component>QuadstoreProvider</Component>);
    expect(screen.getByText('QuadstoreProvider')).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<Component className={"test-class"}>QuadstoreProvider</Component>);
    expect(screen.getByText("QuadstoreProvider")).toHaveClass("test-class");
  });
});