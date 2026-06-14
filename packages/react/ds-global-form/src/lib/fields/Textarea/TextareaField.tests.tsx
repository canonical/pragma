import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { TextareaField } from "./index.js";

describe("TextareaField", () => {
  it("renders a textarea element", () => {
    renderWithForm(<TextareaField name="content" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("registers with react-hook-form", () => {
    renderWithForm(<TextareaField name="content" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("name", "content");
  });

  it("applies chrome and component classes", () => {
    renderWithForm(<TextareaField name="content" />);
    const el = screen.getByRole("textbox");
    expect(el).toHaveClass("ds", "input", "textarea", "chrome");
  });

  it("supports disabled state", () => {
    renderWithForm(<TextareaField name="content" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("shows error on validation failure", async () => {
    renderWithForm(
      <TextareaField name="content" registerProps={{ required: "Required" }} />,
      { formProps: { mode: "onTouched" } },
    );
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Required");
    });
  });

  it("accepts user input", () => {
    renderWithForm(<TextareaField name="content" />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "hello" } });
    expect(input).toHaveValue("hello");
  });
});
