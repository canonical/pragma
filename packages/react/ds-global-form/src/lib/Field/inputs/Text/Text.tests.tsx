import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../../testing/renderWithForm.js";
import Text from "./Text.js";

describe("Text", () => {
  it("renders an input element", () => {
    renderWithForm(<Text name="username" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("registers with react-hook-form", () => {
    renderWithForm(<Text name="username" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("name", "username");
  });

  it("renders prefix and suffix", () => {
    renderWithForm(<Text name="domain" prefix="https://" suffix=".com" />);
    expect(screen.getByText("https://")).toBeInTheDocument();
    expect(screen.getByText(".com")).toBeInTheDocument();
  });

  it("applies the form-input class", () => {
    renderWithForm(<Text name="username" />);
    expect(screen.getByRole("textbox")).toHaveClass("form-input");
  });

  it("supports disabled state", () => {
    renderWithForm(<Text name="username" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("shows error on validation failure", async () => {
    renderWithForm(
      <Text name="email" registerProps={{ required: "Required" }} />,
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
    renderWithForm(<Text name="username" />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "john" } });
    expect(input).toHaveValue("john");
  });
});
