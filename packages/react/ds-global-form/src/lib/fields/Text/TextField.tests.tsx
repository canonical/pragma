import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { TextField } from "./index.js";

// Field-tier tests: the connected component bound to react-hook-form.
describe("TextField", () => {
  it("registers with react-hook-form", () => {
    renderWithForm(<TextField name="username" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("name", "username");
  });

  it("shows an error on validation failure", async () => {
    renderWithForm(
      <TextField name="email" registerProps={{ required: "Required" }} />,
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
    renderWithForm(<TextField name="username" />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "john" } });
    expect(input).toHaveValue("john");
  });
});
