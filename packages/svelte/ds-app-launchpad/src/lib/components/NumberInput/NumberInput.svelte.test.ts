import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./NumberInput.svelte";

describe("NumberInput component", () => {
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
      await expect.element(componentLocator(page)).toHaveClass("number-input");
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
    it("sets type to number", async () => {
      const page = render(Component, { ...baseProps });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("type", "number");
    });

    it("applies value", async () => {
      const page = render(Component, {
        ...baseProps,
        value: 123,
      });
      await expect.element(componentLocator(page)).toHaveValue(123);
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

      await input.fill("7");
      await expect.element(input).toBeValid();
    });

    it("applies min and max", async () => {
      const page = render(Component, {
        ...baseProps,
        min: 5,
        max: 10,
      });
      const input = componentLocator(page);

      await expect.element(input).toHaveAttribute("min", "5");
      await expect.element(input).toHaveAttribute("max", "10");

      await input.fill("4");
      await expect.element(input).toBeInvalid();

      await input.fill("7");
      await expect.element(input).toBeValid();

      await input.fill("11");
      await expect.element(input).toBeInvalid();
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("spinbutton");
}
