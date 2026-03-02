import type { Locator } from "@vitest/browser/context";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Switch.svelte";

describe("Switch component", () => {
  const baseProps = {};

  it("renders", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toBeInTheDocument();
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
      await expect.element(componentLocator(page)).toHaveClass("switch");
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

  describe("Switch state", () => {
    it("is not checked by default", async () => {
      const page = render(Component, { ...baseProps });
      const switchElement = componentLocator(page);
      await expect.element(switchElement).not.toBeChecked();
      await expect
        .element(switchElement)
        .toHaveAttribute("aria-checked", "false");
    });

    it("can be checked", async () => {
      const page = render(Component, { ...baseProps, checked: true });
      const switchElement = componentLocator(page);
      await expect.element(switchElement).toBeChecked();
      await expect
        .element(switchElement)
        .toHaveAttribute("aria-checked", "true");
    });

    it("isn't disabled by default", async () => {
      const page = render(Component, { ...baseProps });
      const switchElement = componentLocator(page);
      await expect.element(switchElement).not.toBeDisabled();
      await expect
        .element(switchElement)
        .not.toHaveAttribute("aria-readonly", "true");
    });

    it("can be disabled", async () => {
      const page = render(Component, { ...baseProps, disabled: true });
      const switchElement = componentLocator(page);
      await expect.element(switchElement).toBeDisabled();
      await expect
        .element(switchElement)
        .toHaveAttribute("aria-readonly", "true");
    });

    it("toggles checked state on click", async () => {
      const page = render(Component, { ...baseProps });
      const switchElement = componentLocator(page);

      await expect.element(switchElement).not.toBeChecked();
      await switchElement.click();
      await expect.element(switchElement).toBeChecked();
      await expect
        .element(switchElement)
        .toHaveAttribute("aria-checked", "true");

      await switchElement.click();
      await expect.element(switchElement).not.toBeChecked();
      await expect
        .element(switchElement)
        .toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Group controlled", () => {
    it("isn't checked if group and value are undefined", async () => {
      const page = render(Component, {
        ...baseProps,
        group: undefined,
        value: undefined,
      });
      await expect.element(componentLocator(page)).not.toBeChecked();
    });

    it("isn't checked if group doesn't include value", async () => {
      const page = render(Component, {
        ...baseProps,
        group: ["a", "b"],
        value: "c",
      });
      await expect.element(componentLocator(page)).not.toBeChecked();
    });

    it("is checked if group includes value", async () => {
      const page = render(Component, {
        ...baseProps,
        group: ["a", "b", "c"],
        value: "c",
      });
      await expect.element(componentLocator(page)).toBeChecked();
    });
  });

  describe("Events", () => {
    it("emits change event on click", async () => {
      const onchange = vi.fn();

      const page = render(Component, { ...baseProps, onchange });
      const switchElement = componentLocator(page);
      await switchElement.click();
      expect(onchange).toHaveBeenCalledOnce();
    });
  });

  describe("Accessibility", () => {
    it("can be focused", async () => {
      const page = render(Component, { ...baseProps });
      const switchElement = componentLocator(page);
      (switchElement.element() as HTMLElement).focus();
      await expect.element(switchElement).toHaveFocus();
    });

    it("can be toggled with space key", async () => {
      const page = render(Component, { ...baseProps });
      const switchElement = componentLocator(page);
      await expect.element(switchElement).not.toBeChecked();
      (switchElement.element() as HTMLElement).focus();
      await expect.element(switchElement).toHaveFocus();
      await userEvent.keyboard("{Space}");
      await expect.element(switchElement).toBeChecked();
      await userEvent.keyboard("{Space}");
      await expect.element(switchElement).not.toBeChecked();
    });
  });
});

// biome-ignore lint/suspicious/noExplicitAny: Svelte 5 component types are incompatible with RenderResult's Component constraint
function componentLocator(page: RenderResult<any>): Locator {
  return page.getByRole("switch");
}
