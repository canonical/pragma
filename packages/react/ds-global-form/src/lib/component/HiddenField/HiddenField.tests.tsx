import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../testing/renderWithForm.js";
import { HiddenField } from "./index.js";

describe("HiddenField", () => {
  it("renders a hidden input", () => {
    const { container } = renderWithForm(<HiddenField name="secret" />);
    expect(container.querySelector('input[type="hidden"]')).toBeInTheDocument();
  });

  it("registers with react-hook-form", () => {
    const { container } = renderWithForm(<HiddenField name="secret" />);
    expect(container.querySelector('input[type="hidden"]')).toHaveAttribute(
      "name",
      "secret",
    );
  });

  it("receives default value from the form", () => {
    const { container } = renderWithForm(<HiddenField name="secret" />, {
      formProps: { defaultValues: { secret: "hidden-value" } },
    });
    expect(container.querySelector('input[type="hidden"]')).toHaveValue(
      "hidden-value",
    );
  });
});
