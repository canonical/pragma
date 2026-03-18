import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithForm } from "../../../../testing/renderWithForm.js";
import Text from "../../inputs/Text/Text.js";
import type { BaseInputProps, Middleware } from "../../types.js";

// Text is already wrapped with withWrapper, so we test through it.

describe("withWrapper", () => {
  it("renders the wrapper with label and description", () => {
    renderWithForm(
      <Text name="email" label="Email" description="Enter your email" />,
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Enter your email")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders the optional indicator", () => {
    renderWithForm(<Text name="email" label="Email" isOptional />);
    expect(screen.getByText(/optional/)).toBeInTheDocument();
  });

  it("displays error message on validation failure", async () => {
    renderWithForm(
      <Text
        name="email"
        label="Email"
        registerProps={{ required: "Email is required" }}
      />,
      { formProps: { mode: "onTouched" } },
    );
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Email is required");
    });
  });

  it("applies middleware in order", () => {
    const order: string[] = [];
    const middlewareA: Middleware<BaseInputProps> = (Component) => {
      const Wrapped = (props: BaseInputProps) => {
        order.push("A");
        return <Component {...props} />;
      };
      return Wrapped;
    };
    const middlewareB: Middleware<BaseInputProps> = (Component) => {
      const Wrapped = (props: BaseInputProps) => {
        order.push("B");
        return <Component {...props} />;
      };
      return Wrapped;
    };
    renderWithForm(
      <Text name="test" middleware={[middlewareA, middlewareB]} />,
    );
    // React strict mode double-renders, producing [A, B, A, B].
    // Verify A always comes before B in each render pass.
    const firstA = order.indexOf("A");
    const firstB = order.indexOf("B");
    expect(firstA).toBeLessThan(firstB);
    expect(order.filter((v) => v === "A").length).toBe(
      order.filter((v) => v === "B").length,
    );
  });

  it("supports conditional display — shown when condition is true", () => {
    renderWithForm(
      <Text
        name="dependent"
        label="Dependent"
        condition={[["toggle"], (values: unknown[]) => values[0] === true]}
      />,
      { formProps: { defaultValues: { toggle: true } } },
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("supports conditional display — hidden when condition is false", () => {
    renderWithForm(
      <Text
        name="dependent"
        label="Dependent"
        condition={[["toggle"], (values: unknown[]) => values[0] === true]}
      />,
      { formProps: { defaultValues: { toggle: false } } },
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
