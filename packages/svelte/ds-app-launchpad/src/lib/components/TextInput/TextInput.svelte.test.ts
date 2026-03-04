import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./TextInput.svelte";

describe("TextInput component", () => {
  const baseProps = {} satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toBeVisible();
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, expected) => {
      const page = render(Component, { ...baseProps, [attribute]: expected });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, expected);
    });

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      await expect.element(componentLocator(page)).toHaveClass("test-class");
      await expect.element(componentLocator(page)).toHaveClass("ds");
      await expect.element(componentLocator(page)).toHaveClass("text-input");
    });

    it("applies style", async () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      await expect
        .element(componentLocator(page))
        .toHaveStyle({ color: "orange" });
    });
  });

  describe("Input attributes", () => {
    describe("type", () => {
      it("defaults to text", async () => {
        const page = render(Component, { ...baseProps });
        await expect
          .element(componentLocator(page))
          .toHaveAttribute("type", "text");
      });

      it.each([
        "text",
        "password",
        "email",
        "url",
        "tel",
      ] as const)("accepts %s", async (type) => {
        const page = render(Component, {
          ...baseProps,
          type,
        });
        await expect
          .element(componentLocator(page))
          .toHaveAttribute("type", type);
      });

      it("accepts search", async () => {
        const page = render(Component, {
          ...baseProps,
          type: "search",
        });
        await expect
          .element(page.getByRole("searchbox"))
          .toHaveAttribute("type", "search");
      });
    });

    it("applies value", async () => {
      const page = render(Component, {
        ...baseProps,
        value: "Test value",
      });
      await expect.element(componentLocator(page)).toHaveValue("Test value");
    });

    describe("Disabled state", () => {
      it("isn't disabled by default", async () => {
        const page = render(Component, { ...baseProps });
        await expect.element(componentLocator(page)).not.toBeDisabled();
      });

      it("can be disabled", async () => {
        const page = render(Component, {
          ...baseProps,
          disabled: true,
        });
        await expect.element(componentLocator(page)).toBeDisabled();
      });
    });
  });

  describe("Validation attributes", () => {
    it("applies required", async () => {
      const page = render(Component, {
        ...baseProps,
        required: true,
      });
      const input = componentLocator(page);

      await expect.element(input).toBeRequired();
      await expect.element(input).toBeInvalid();

      await input.fill("Some value");
      await expect.element(input).toBeValid();
    });

    it("minlength", async () => {
      const page = render(Component, {
        ...baseProps,
        minlength: 5,
      });
      const input = componentLocator(page);

      await expect.element(input).toHaveAttribute("minlength", "5");

      await input.fill("1234");
      await expect.element(input).toBeInvalid();

      await input.fill("12345");
      await expect.element(input).toBeValid();
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("textbox");
}
