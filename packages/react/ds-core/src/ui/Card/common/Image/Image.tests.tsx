/* @canonical/generator-ds 0.10.0-experimental.2 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Component from "./Image.js";

describe("Image component", () => {
  it("renders", () => {
    const imgSrc = "https://placehold.co/400";
    render(<Component src={imgSrc} />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", imgSrc);
  });
});
