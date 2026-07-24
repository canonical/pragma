import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Component from "./KeyboardKeys.svelte";

const children = createRawSnippet(() => ({
  render: () => "<span>Test content</span>",
})) satisfies ComponentProps<typeof Component>["children"];

describe("KeyboardKeys component", () => {
  it("renders children", async () => {
    const page = render(Component, { children });
    await expect.element(page.getByText("Test content")).toBeVisible();
  });

  describe("attributes", () => {
    it("passes through additional props", async () => {
      const page = render(Component, {
        children,
        "data-testid": "test-component",
      });
      await expect
        .element(page.getByTestId("test-component"))
        .toBeInTheDocument();
    });

    it("applies base and custom classes", async () => {
      const page = render(Component, {
        children,
        class: "custom-class",
        "data-testid": "keyboard-keys",
      });
      const el = page.getByTestId("keyboard-keys");
      await expect.element(el).toHaveClass("ds");
      await expect.element(el).toHaveClass("keyboard-keys");
      await expect.element(el).toHaveClass("custom-class");
    });
  });
});
