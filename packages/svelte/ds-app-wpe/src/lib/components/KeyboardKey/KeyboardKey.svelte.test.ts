import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Component from "./KeyboardKey.svelte";

describe("KeyboardKey component", () => {
  it("renders the label for a key", async () => {
    const page = render(Component, { keyValue: "enter" });
    await expect.element(page.getByText("↵")).toBeVisible();
  });

  describe("attributes", () => {
    it("passes through additional props", async () => {
      const page = render(Component, {
        keyValue: "ctrl",
        "data-testid": "test-component",
      });
      await expect
        .element(page.getByTestId("test-component"))
        .toBeInTheDocument();
    });

    it("sets an accessible label for symbol keys", async () => {
      const page = render(Component, { keyValue: "enter" });
      await expect
        .element(page.getByText("↵"))
        .toHaveAttribute("aria-label", "Enter");
    });

    it("applies base and custom classes", async () => {
      const page = render(Component, { keyValue: "ctrl", class: "test-class" });
      const el = page.getByText("Ctrl");
      await expect.element(el).toHaveClass("ds");
      await expect.element(el).toHaveClass("keyboard-key");
      await expect.element(el).toHaveClass("code");
      await expect.element(el).toHaveClass("test-class");
    });
  });
});
