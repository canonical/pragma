import type { Locator } from "@vitest/browser/context";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Button.svelte";

describe("Button component", () => {
  const baseProps = {
    "data-testid": "button",
    children: createRawSnippet(() => ({
      render: () => `<span>Click me</span>`,
    })),
  } satisfies ComponentProps<typeof Component>;

  it("renders children", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(page.getByText("Click me")).toBeInTheDocument();
  });

  it("renders as a button element", async () => {
    const page = render(Component, { ...baseProps });
    const root = componentLocator(page).element();
    expect(root.tagName).toBe("BUTTON");
  });

  it("applies the ds button classes", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toHaveClass("ds", "button");
  });

  it("applies the default importance class", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toHaveClass("primary");
  });

  it("applies a custom importance class", async () => {
    const page = render(Component, { ...baseProps, importance: "secondary" });
    await expect.element(componentLocator(page)).toHaveClass("secondary");
  });

  it("applies an anticipation class", async () => {
    const page = render(Component, {
      ...baseProps,
      anticipation: "destructive",
    });
    await expect.element(componentLocator(page)).toHaveClass("destructive");
  });

  it("applies the link variant class", async () => {
    const page = render(Component, { ...baseProps, variant: "link" });
    await expect.element(componentLocator(page)).toHaveClass("link");
  });

  it("applies a custom class", async () => {
    const page = render(Component, { ...baseProps, class: "test-class" });
    await expect
      .element(componentLocator(page))
      .toHaveClass("ds", "button", "test-class");
  });

  it("passes through additional props", async () => {
    const page = render(Component, { ...baseProps });
    await expect
      .element(componentLocator(page))
      .toHaveAttribute("data-testid", "button");
  });

  it("is not disabled by default", async () => {
    const page = render(Component, { ...baseProps });
    const root = componentLocator(page).element() as HTMLButtonElement;
    expect(root.disabled).toBe(false);
  });

  it("is disabled when disabled prop is set", async () => {
    const page = render(Component, { ...baseProps, disabled: true });
    const root = componentLocator(page).element() as HTMLButtonElement;
    expect(root.disabled).toBe(true);
  });

  describe("loading state", () => {
    it("applies the loading class", async () => {
      const page = render(Component, { ...baseProps, loading: true });
      await expect.element(componentLocator(page)).toHaveClass("loading");
    });

    it("sets aria-busy when loading", async () => {
      const page = render(Component, { ...baseProps, loading: true });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("aria-busy", "true");
    });

    it("disables the button when loading", async () => {
      const page = render(Component, { ...baseProps, loading: true });
      const root = componentLocator(page).element() as HTMLButtonElement;
      expect(root.disabled).toBe(true);
    });

    it("does not set aria-busy when not loading", async () => {
      const page = render(Component, { ...baseProps });
      const root = componentLocator(page).element();
      expect(root.hasAttribute("aria-busy")).toBe(false);
    });

    it("renders the loading spinner", async () => {
      const page = render(Component, { ...baseProps, loading: true });
      const spinner = page.container.querySelector(".loading-spinner");
      expect(spinner).not.toBeNull();
    });
  });

  it("renders the icon slot when provided", async () => {
    const icon = createRawSnippet(() => ({
      render: () => `<svg data-testid="icon"></svg>`,
    }));
    const page = render(Component, { ...baseProps, icon });
    const iconSlot = page.container.querySelector(".icon");
    expect(iconSlot).not.toBeNull();
  });
});

// Selects the component root by the testid set in baseProps.
function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("button");
}
