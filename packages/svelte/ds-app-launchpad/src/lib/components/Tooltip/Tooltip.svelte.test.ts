/* @canonical/generator-ds 0.17.1 */

import type { ComponentProps } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Tooltip.svelte";
import { children, trigger } from "./test.fixtures.svelte";
import { ChainingManager } from "./utils/ChainingManager.js";

vi.mock("./utils/ChainingManager.js", async (importActual) => {
  const { ChainingManager: OriginalChainingManager } = await importActual<{
    ChainingManager: typeof ChainingManager;
  }>();

  class Mock extends OriginalChainingManager {
    static lastInstance: Mock | null = null;
    constructor() {
      super(350);
      Mock.lastInstance = this;
    }

    static resetChaining() {
      if (Mock.lastInstance) {
        Mock.lastInstance.chaining = false;
      }
    }
  }

  return {
    ChainingManager: Mock,
  };
});

describe("Tooltip component", () => {
  beforeEach(() => {
    (
      ChainingManager as unknown as { resetChaining: () => void }
    ).resetChaining();
  });

  const baseProps = {
    trigger,
    children,
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page, true)).toBeInTheDocument();
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, expected) => {
      const page = render(Component, { ...baseProps, [attribute]: expected });
      await expect
        .element(componentLocator(page, true))
        .toHaveAttribute(attribute, expected);
    });

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      await expect
        .element(componentLocator(page, true))
        .toHaveClass("test-class");
      await expect.element(componentLocator(page, true)).toHaveClass("ds");
      await expect.element(componentLocator(page, true)).toHaveClass("tooltip");
    });

    it("applies style", async () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      await expect
        .element(componentLocator(page, true))
        .toHaveStyle({ color: "orange" });
    });
  });

  describe("Applies aria-describedby to trigger", () => {
    it("if id not provided", async () => {
      const page = render(Component, { ...baseProps });
      const button = page.getByRole("button", { name: "Tooltip trigger" });
      const tooltip = page.getByRole("tooltip", { includeHidden: true });
      await expect
        .element(button)
        .toHaveAttribute(
          "aria-describedby",
          tooltip.element().getAttribute("id"),
        );
    });

    it("if id is provided", async () => {
      const page = render(Component, { id: "test-id", ...baseProps });
      const button = page.getByRole("button", { name: "Tooltip trigger" });
      await expect
        .element(button)
        .toHaveAttribute("aria-describedby", "test-id");
    });
  });

  describe("Is shown", () => {
    // Seems like `button.hover()` is very flaky in firefox, so it needs some retries. If this is really bad, maybe we should skip hover tests in firefox altogether?
    it("on trigger hover", { retry: 3 }, async () => {
      const page = render(Component, { ...baseProps, delay: 0 });
      const button = page.getByRole("button", { name: "Tooltip trigger" });
      await expect
        .element(page.getByRole("tooltip", { includeHidden: true }))
        .not.toBeVisible();
      await button.hover();
      await expect.element(page.getByRole("tooltip")).toBeVisible();
      await button.unhover();
      await expect
        .element(page.getByRole("tooltip", { includeHidden: true }))
        .not.toBeVisible();
    });

    it("on trigger focus", async () => {
      const page = render(Component, { ...baseProps, delay: 0 });
      const button = page.getByRole("button", { name: "Tooltip trigger" });
      await expect
        .element(page.getByRole("tooltip", { includeHidden: true }))
        .not.toBeVisible();
      (button.element() as HTMLElement).focus();
      await expect.element(page.getByRole("tooltip")).toBeVisible();
      (button.element() as HTMLElement).blur();
      await expect
        .element(page.getByRole("tooltip", { includeHidden: true }))
        .not.toBeVisible();
    });

    it("if mouse moves from trigger to tooltip", async () => {
      const page = render(Component, { ...baseProps, delay: 0 });
      const button = page.getByRole("button", { name: "Tooltip trigger" });
      const tooltip = page.getByRole("tooltip", { includeHidden: true });
      await expect.element(tooltip).not.toBeVisible();
      await button.hover();
      await expect.element(page.getByRole("tooltip")).toBeVisible();
      await tooltip.hover();
      await expect.element(page.getByRole("tooltip")).toBeVisible();
      await tooltip.unhover();
      await expect.element(tooltip).not.toBeVisible();
    });

    it("after delay", async () => {
      vi.useFakeTimers();
      const page = render(Component, { ...baseProps, delay: 350 });
      const button = page.getByRole("button", { name: "Tooltip trigger" });
      await expect
        .element(page.getByRole("tooltip", { includeHidden: true }))
        .not.toBeVisible();
      await button.hover();
      vi.advanceTimersByTime(100);
      await expect
        .element(page.getByRole("tooltip", { includeHidden: true }))
        .not.toBeVisible();
      vi.advanceTimersByTime(250);
      await expect.element(page.getByRole("tooltip")).toBeVisible();
      vi.useRealTimers();
    });

    it("immediately if in chaining", async () => {
      vi.useFakeTimers();
      const page = render(Component, { ...baseProps, delay: 350 });
      const button = page.getByRole("button", { name: "Tooltip trigger" });
      await expect
        .element(page.getByRole("tooltip", { includeHidden: true }))
        .not.toBeVisible();
      await button.hover();
      vi.advanceTimersByTime(350);
      await expect.element(page.getByRole("tooltip")).toBeVisible();
      await button.unhover();
      await expect
        .element(page.getByRole("tooltip", { includeHidden: true }))
        .not.toBeVisible();
      vi.advanceTimersByTime(100);
      await button.hover();
      await expect.element(page.getByRole("tooltip")).toBeVisible();
      vi.useRealTimers();
    });
  });

  describe("Renders", () => {
    it("trigger", async () => {
      const page = render(Component, { ...baseProps });
      const button = page.getByRole("button", { name: "Tooltip trigger" });
      await expect.element(button).toBeInTheDocument();
    });

    it("tooltip", async () => {
      const page = render(Component, { ...baseProps });
      const tooltip = componentLocator(page, true);
      await expect.element(tooltip).toBeInTheDocument();
      await expect.element(tooltip).toHaveTextContent("Tooltip content");
    });

    it("not visible by default", async () => {
      const page = render(Component, { ...baseProps });
      const tooltip = componentLocator(page, true);
      await expect.element(tooltip).not.toBeVisible();
    });
  });
});

function componentLocator(
  page: RenderResult<typeof Component>,
  includeHidden?: boolean,
): Locator {
  return page.getByRole("tooltip", { includeHidden });
}
