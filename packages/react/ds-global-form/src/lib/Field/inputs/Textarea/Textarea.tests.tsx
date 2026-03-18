import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../../testing/renderWithForm.js";
import Textarea from "./Textarea.js";

describe("Textarea", () => {
  it("renders a textarea element", () => {
    renderWithForm(<Textarea name="content" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("registers with react-hook-form", () => {
    renderWithForm(<Textarea name="content" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("name", "content");
  });

  it("applies both form-input and component class", () => {
    renderWithForm(<Textarea name="content" />);
    const el = screen.getByRole("textbox");
    expect(el).toHaveClass("form-input");
    expect(el).toHaveClass("form-textarea");
  });

  it("supports disabled state", () => {
    renderWithForm(<Textarea name="content" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
