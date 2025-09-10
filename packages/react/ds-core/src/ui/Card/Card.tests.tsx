/* @canonical/generator-ds 0.10.0-experimental.2 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Card.js";

describe("Card component", () => {
  it("renders", () => {
    render(<Component>Card</Component>);
    expect(screen.getByText("Card")).toBeInTheDocument();
  });
});
