import type { Locator } from "@vitest/browser/context";
import type { ComponentProps } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import Component from "./Radio.svelte";

describe("Radio component", () => {
  const baseProps = {} satisfies ComponentProps<typeof Component>;

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
      await expect.element(componentLocator(page)).toHaveClass("radio");
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

    it("can be checked by on click", async () => {
      const page = render(Component, { ...baseProps });
      const radio = componentLocator(page);

      await expect.element(radio).not.toBeChecked();
      await radio.click();
      await expect.element(radio).toBeChecked();
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

    it("isn't checked if group doesn't match value", async () => {
      const page = render(Component, {
        ...baseProps,
        group: "test-group",
        value: "test-value",
      });
      await expect.element(componentLocator(page)).not.toBeChecked();
    });

    it("is checked if group and value match", async () => {
      const page = render(Component, {
        ...baseProps,
        group: "test-value",
        value: "test-value",
      });
      await expect.element(componentLocator(page)).toBeChecked();
    });
  });

  describe("Events", () => {
    it("emits change event on click", async () => {
      const onchange = vi.fn();

      const page = render(Component, { ...baseProps, onchange });
      const radio = componentLocator(page);

      await expect.element(radio).not.toBeChecked();
      await radio.click();
      expect(onchange).toHaveBeenCalledOnce();
    });
  });
});

function componentLocator(page: ReturnType<typeof render>): Locator {
  return page.getByRole("radio");
}
