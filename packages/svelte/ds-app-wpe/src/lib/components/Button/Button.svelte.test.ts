import type { Locator } from "@vitest/browser/context";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Button.svelte";
import {
  buttonChildren,
  buttonChildrenText,
  buttonIcon,
  complexChildren,
  complexChildrenText,
  iconTestId,
  submitChildren,
  submitChildrenText,
} from "./test.fixtures.svelte";

describe("Button component", () => {
  const baseProps = {
    "data-testid": "button",
    children: buttonChildren,
  } satisfies ComponentProps<typeof Component>;

  describe("rendering", () => {
    it("renders children", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(page.getByText(buttonChildrenText)).toBeInTheDocument();
    });

    it("renders as a button element", async () => {
      const page = render(Component, { ...baseProps });
      const root = componentLocator(page).element();
      expect(root.tagName).toBe("BUTTON");
    });

    it("applies base classes", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(componentLocator(page)).toHaveClass("ds", "button");
    });

    it("renders without children", async () => {
      const page = render(Component, { "aria-label": "Empty button" });
      await expect.element(page.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("class prop", () => {
    it("applies custom class", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      await expect
        .element(componentLocator(page))
        .toHaveClass("test-class");
    });

    it("preserves base classes with custom class", async () => {
      const page = render(Component, { ...baseProps, class: "custom" });
      await expect
        .element(componentLocator(page))
        .toHaveClass("ds", "button", "custom");
    });
  });

  describe("importance modifier", () => {
    it("applies primary importance class by default", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(componentLocator(page)).toHaveClass("primary");
    });

    it("applies secondary importance class", async () => {
      const page = render(Component, { ...baseProps, importance: "secondary" });
      await expect.element(componentLocator(page)).toHaveClass("secondary");
    });

    it("applies tertiary importance class", async () => {
      const page = render(Component, { ...baseProps, importance: "tertiary" });
      await expect.element(componentLocator(page)).toHaveClass("tertiary");
    });
  });

  describe("anticipation modifier", () => {
    it("applies constructive anticipation class", async () => {
      const page = render(Component, {
        ...baseProps,
        anticipation: "constructive",
      });
      await expect.element(componentLocator(page)).toHaveClass("constructive");
    });

    it("applies caution anticipation class", async () => {
      const page = render(Component, {
        ...baseProps,
        anticipation: "caution",
      });
      await expect.element(componentLocator(page)).toHaveClass("caution");
    });

    it("applies destructive anticipation class", async () => {
      const page = render(Component, {
        ...baseProps,
        anticipation: "destructive",
      });
      await expect.element(componentLocator(page)).toHaveClass("destructive");
    });
  });

  describe("orthogonal modifiers", () => {
    it("applies both importance and anticipation classes", async () => {
      const page = render(Component, {
        ...baseProps,
        importance: "primary",
        anticipation: "destructive",
      });
      await expect
        .element(componentLocator(page))
        .toHaveClass("primary", "destructive");
    });
  });

  describe("variant prop", () => {
    it("applies link variant class", async () => {
      const page = render(Component, { ...baseProps, variant: "link" });
      await expect.element(componentLocator(page)).toHaveClass("link");
    });
  });

  describe("icon prop", () => {
    it("renders the icon slot when provided", async () => {
      const page = render(Component, { ...baseProps, icon: buttonIcon });
      const iconSlot = page.container.querySelector(".icon");
      expect(iconSlot).not.toBeNull();
    });

    it("renders the icon before the label in DOM order", async () => {
      const page = render(Component, { ...baseProps, icon: buttonIcon });
      const button = componentLocator(page).element();
      const iconSlot = button.querySelector(".icon");
      const label = button.querySelector(".label");
      expect(
        iconSlot!.compareDocumentPosition(label!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("wraps the icon in the icon slot class", async () => {
      const page = render(Component, { ...baseProps, icon: buttonIcon });
      const iconWrapper = page.container.querySelector(
        `[data-testid='${iconTestId}']`,
      )?.parentElement;
      expect(iconWrapper).toHaveClass("icon");
    });

    it("renders icon-only button", async () => {
      const page = render(Component, { icon: buttonIcon, "aria-label": "Close" });
      expect(page.container.querySelector(`[data-testid='${iconTestId}']`)).not.toBeNull();
      await expect
        .element(page.getByRole("button"))
        .toHaveAttribute("aria-label", "Close");
    });
  });

  describe("accessibility", () => {
    it("derives its accessible name from children without aria-label", async () => {
      const page = render(Component, { children: submitChildren });
      const button = page.getByRole("button", { name: submitChildrenText });
      await expect.element(button).not.toHaveAttribute("aria-label");
    });

    it("derives its accessible name from snippet children content", async () => {
      const page = render(Component, { children: complexChildren });
      const button = page.getByRole("button", { name: complexChildrenText });
      await expect.element(button).not.toHaveAttribute("aria-label");
    });

    it("applies an explicit aria-label", async () => {
      const page = render(Component, {
        ...baseProps,
        "aria-label": "Submit form",
      });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("aria-label", "Submit form");
    });
  });

  describe("disabled state", () => {
    it("is not disabled by default", async () => {
      const page = render(Component, { ...baseProps });
      const root = componentLocator(page).element() as HTMLButtonElement;
      expect(root.disabled).toBe(false);
    });

    it("can be disabled", async () => {
      const page = render(Component, { ...baseProps, disabled: true });
      const root = componentLocator(page).element() as HTMLButtonElement;
      expect(root.disabled).toBe(true);
    });
  });

  describe("loading state", () => {
    it("overlays a Spinner while loading", async () => {
      const page = render(Component, { ...baseProps, loading: true });
      const spinner = page.container.querySelector(".loading-spinner .ds.spinner");
      expect(spinner).not.toBeNull();
    });

    it("marks the button aria-busy and disabled", async () => {
      const page = render(Component, { ...baseProps, loading: true });
      const root = componentLocator(page).element() as HTMLButtonElement;
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("aria-busy", "true");
      expect(root.disabled).toBe(true);
    });

    it("applies the loading class", async () => {
      const page = render(Component, { ...baseProps, loading: true });
      await expect.element(componentLocator(page)).toHaveClass("loading");
    });

    it("keeps the label in the DOM while loading (preserves width, no collapse)", async () => {
      const page = render(Component, { ...baseProps, loading: true });
      const label = page.container.querySelector(".label");
      expect(label).not.toBeNull();
      expect(label?.textContent).toContain(buttonChildrenText);
    });

    it("keeps the consumer icon in the DOM but adds the Spinner overlay", async () => {
      const page = render(Component, { ...baseProps, loading: true, icon: buttonIcon });
      expect(page.container.querySelector(".icon")).not.toBeNull();
      expect(page.container.querySelector(".loading-spinner")).not.toBeNull();
    });

    it("is neither busy nor disabled when not loading", async () => {
      const page = render(Component, { ...baseProps });
      const root = componentLocator(page).element() as HTMLButtonElement;
      expect(root.hasAttribute("aria-busy")).toBe(false);
      expect(root.disabled).toBe(false);
    });
  });

  describe("HTML attributes", () => {
    it("passes through HTML button attributes", async () => {
      const page = render(Component, {
        ...baseProps,
        type: "submit",
        name: "submitBtn",
        value: "submit",
      });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("type", "submit");
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("name", "submitBtn");
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("value", "submit");
    });

    it("applies id prop", async () => {
      const page = render(Component, { ...baseProps, id: "my-button" });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("id", "my-button");
    });

    it("applies style prop", async () => {
      const page = render(Component, { ...baseProps, style: "color: red;" });
      await expect
        .element(componentLocator(page))
        .toHaveStyle({ color: "rgb(255, 0, 0)" });
    });
  });
});

// Selects the component root by the testid set in baseProps.
function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("button");
}
