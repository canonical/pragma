import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../../testing/renderWithForm.js";
import Hidden from "./Hidden.js";

describe("Hidden", () => {
  it("renders a hidden input", () => {
    const { container } = renderWithForm(<Hidden name="secret" />);
    const input = container.querySelector('input[type="hidden"]');
    expect(input).toBeInTheDocument();
  });

  it("registers with react-hook-form", () => {
    const { container } = renderWithForm(<Hidden name="secret" />);
    const input = container.querySelector('input[type="hidden"]');
    expect(input).toHaveAttribute("name", "secret");
  });

  it("receives default value from form", () => {
    const { container } = renderWithForm(<Hidden name="secret" />, {
      formProps: { defaultValues: { secret: "hidden-value" } },
    });
    const input = container.querySelector('input[type="hidden"]');
    expect(input).toHaveValue("hidden-value");
  });
});
