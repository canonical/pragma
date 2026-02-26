import type { Locator } from "@vitest/browser/context";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import type { RenderResult } from "vitest-browser-svelte";
import Component from "./Checkbox.svelte";

describe("Checkbox component", () => {
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
      await expect.element(componentLocator(page)).toHaveClass("checkbox");
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

  describe("Checked state", () => {
    it("is not checked by default", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(componentLocator(page)).not.toBeChecked();
    });

    it("can be checked", async () => {
      const page = render(Component, { ...baseProps, checked: true });
      await expect.element(componentLocator(page)).toBeChecked();
    });

    it("isn't disabled by default", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(componentLocator(page)).not.toBeDisabled();
    });

    it("can be disabled", async () => {
      const page = render(Component, { ...baseProps, disabled: true });
      await expect.element(componentLocator(page)).toBeDisabled();
    });

    it("toggles on click", async () => {
      const page = render(Component, { ...baseProps });
      const checkbox = componentLocator(page);

      await expect.element(checkbox).not.toBeChecked();
      await checkbox.click();
      await expect.element(checkbox).toBeChecked();
    });

    it("is not indeterminate by default", async () => {
      const page = render(Component, { ...baseProps });
      await expect
        .element(componentLocator(page))
        .not.toHaveAttribute("indeterminate");
    });

    it("can be indeterminate", async () => {
      const onlyIndeterminate = render(Component, {
        ...baseProps,
        indeterminate: true,
      });
      await expect
        .element(componentLocator(onlyIndeterminate))
        .toBePartiallyChecked();
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
      const checkbox = componentLocator(page);

      await expect.element(checkbox).not.toBeChecked();
      await checkbox.click();
      expect(onchange).toHaveBeenCalledOnce();
    });
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function componentLocator(page: RenderResult<any>): Locator {
  return page.getByRole("checkbox");
}
