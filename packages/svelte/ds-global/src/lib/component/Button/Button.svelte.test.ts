import type { Locator } from "@vitest/browser/context";
import type { ComponentProps } from "svelte";
import { describe, expect, it, onTestFinished, vi } from "vitest";
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
      const page = await render(Component, { ...baseProps });
      await expect
        .element(page.getByText(buttonChildrenText))
        .toBeInTheDocument();
    });

    it("renders as a button element", async () => {
      const page = await render(Component, { ...baseProps });
      const root = componentLocator(page).element();
      expect(root.tagName).toBe("BUTTON");
    });

    it("applies base classes", async () => {
      const page = await render(Component, { ...baseProps });
      await expect.element(componentLocator(page)).toHaveClass("ds", "button");
    });

    it("renders without children", async () => {
      const page = await render(Component, { "aria-label": "Empty button" });
      await expect.element(page.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("class prop", () => {
    it("applies custom class", async () => {
      const page = await render(Component, {
        ...baseProps,
        class: "test-class",
      });
      await expect.element(componentLocator(page)).toHaveClass("test-class");
    });

    it("preserves base classes with custom class", async () => {
      const page = await render(Component, { ...baseProps, class: "custom" });
      await expect
        .element(componentLocator(page))
        .toHaveClass("ds", "button", "custom");
    });
  });

  describe("importance modifier", () => {
    it("applies primary importance class by default", async () => {
      const page = await render(Component, { ...baseProps });
      await expect.element(componentLocator(page)).toHaveClass("primary");
    });

    it("applies secondary importance class", async () => {
      const page = await render(Component, {
        ...baseProps,
        importance: "secondary",
      });
      await expect.element(componentLocator(page)).toHaveClass("secondary");
    });

    it("applies tertiary importance class", async () => {
      const page = await render(Component, {
        ...baseProps,
        importance: "tertiary",
      });
      await expect.element(componentLocator(page)).toHaveClass("tertiary");
    });
  });

  describe("anticipation modifier", () => {
    it("applies constructive anticipation class", async () => {
      const page = await render(Component, {
        ...baseProps,
        anticipation: "constructive",
      });
      await expect.element(componentLocator(page)).toHaveClass("constructive");
    });

    it("applies caution anticipation class", async () => {
      const page = await render(Component, {
        ...baseProps,
        anticipation: "caution",
      });
      await expect.element(componentLocator(page)).toHaveClass("caution");
    });

    it("applies destructive anticipation class", async () => {
      const page = await render(Component, {
        ...baseProps,
        anticipation: "destructive",
      });
      await expect.element(componentLocator(page)).toHaveClass("destructive");
    });
  });

  describe("emphasis modifier", () => {
    it("applies no emphasis class by default", async () => {
      const page = await render(Component, { ...baseProps });
      await expect.element(componentLocator(page)).not.toHaveClass("branded");
    });

    it.each(["primary", "secondary", "tertiary"] as const)(
      "applies the branded class with %s importance",
      async (importance) => {
        const page = await render(Component, {
          ...baseProps,
          importance,
          emphasis: "branded",
        });
        await expect
          .element(componentLocator(page))
          .toHaveClass(importance, "branded");
      },
    );
  });

  describe("orthogonal modifiers", () => {
    it("applies both importance and anticipation classes", async () => {
      const page = await render(Component, {
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
      const page = await render(Component, { ...baseProps, variant: "link" });
      await expect.element(componentLocator(page)).toHaveClass("link");
    });
  });

  describe("icon prop", () => {
    it("renders the icon slot when provided", async () => {
      const page = await render(Component, { ...baseProps, icon: buttonIcon });
      const iconSlot = page.container.querySelector(".icon");
      expect(iconSlot).not.toBeNull();
    });

    it("renders the icon before the label in DOM order", async () => {
      const page = await render(Component, { ...baseProps, icon: buttonIcon });
      const button = componentLocator(page).element();
      const children = Array.from(button.children);
      const iconSlotIndex = children.findIndex((el) =>
        el.classList.contains("icon"),
      );
      const labelIndex = children.findIndex((el) =>
        el.classList.contains("label"),
      );
      expect(iconSlotIndex).toBeLessThan(labelIndex);
    });

    it("wraps the icon in the icon slot class", async () => {
      const page = await render(Component, { ...baseProps, icon: buttonIcon });
      const iconWrapper = page.container.querySelector(
        `[data-testid='${iconTestId}']`,
      )?.parentElement;
      expect(iconWrapper).toHaveClass("icon");
    });

    it("renders icon-only button", async () => {
      const page = await render(Component, {
        icon: buttonIcon,
        "aria-label": "Close",
      });
      expect(
        page.container.querySelector(`[data-testid='${iconTestId}']`),
      ).not.toBeNull();
      await expect
        .element(page.getByRole("button"))
        .toHaveAttribute("aria-label", "Close");
    });
  });

  describe("accessibility", () => {
    it("derives its accessible name from children without aria-label", async () => {
      const page = await render(Component, { children: submitChildren });
      const button = page.getByRole("button", { name: submitChildrenText });
      await expect.element(button).not.toHaveAttribute("aria-label");
    });

    it("derives its accessible name from snippet children content", async () => {
      const page = await render(Component, { children: complexChildren });
      const button = page.getByRole("button", { name: complexChildrenText });
      await expect.element(button).not.toHaveAttribute("aria-label");
    });

    it("applies an explicit aria-label", async () => {
      const page = await render(Component, {
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
      const page = await render(Component, { ...baseProps });
      const root = componentLocator(page).element() as HTMLButtonElement;
      expect(root.disabled).toBe(false);
    });

    it("can be disabled", async () => {
      const page = await render(Component, { ...baseProps, disabled: true });
      const root = componentLocator(page).element() as HTMLButtonElement;
      expect(root.disabled).toBe(true);
    });
  });

  describe("loading state", () => {
    it("overlays a Spinner while loading", async () => {
      const page = await render(Component, { ...baseProps, loading: true });
      const spinner = page.container.querySelector(
        ".loading-spinner .ds.spinner",
      );
      expect(spinner).not.toBeNull();
    });

    it("marks the button aria-busy and aria-disabled", async () => {
      const page = await render(Component, { ...baseProps, loading: true });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("aria-busy", "true");
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("aria-disabled", "true");
    });

    it("does not natively disable the button while loading", async () => {
      const page = await render(Component, { ...baseProps, loading: true });
      const root = componentLocator(page).element() as HTMLButtonElement;
      expect(root.disabled).toBe(false);
    });

    it("keeps keyboard focus when loading starts", async () => {
      const page = await render(Component, { ...baseProps, loading: false });
      const root = componentLocator(page).element() as HTMLButtonElement;
      root.focus();
      expect(document.activeElement).toBe(root);
      await page.rerender({ loading: true });
      expect(document.activeElement).toBe(root);
    });

    it("stays natively disabled, without aria-disabled, when also disabled", async () => {
      const page = await render(Component, {
        ...baseProps,
        loading: true,
        disabled: true,
      });
      const root = componentLocator(page).element() as HTMLButtonElement;
      expect(root.disabled).toBe(true);
      expect(root.hasAttribute("aria-disabled")).toBe(false);
    });

    it("keeps its accessible name from the label while loading", async () => {
      const page = await render(Component, { ...baseProps, loading: true });
      await expect
        .element(page.getByRole("button", { name: buttonChildrenText }))
        .toBeInTheDocument();
    });

    it("keeps its accessible name from the label while loading", async () => {
      const page = await render(Component, { ...baseProps, loading: true });
      await expect
        .element(page.getByRole("button", { name: buttonChildrenText }))
        .toBeInTheDocument();
    });

    it("applies the loading class", async () => {
      const page = await render(Component, { ...baseProps, loading: true });
      await expect.element(componentLocator(page)).toHaveClass("loading");
    });

    it("keeps the label in the DOM while loading (preserves width, no collapse)", async () => {
      const page = await render(Component, { ...baseProps, loading: true });
      const label = page.container.querySelector(".label");
      expect(label).not.toBeNull();
      expect(label?.textContent).toContain(buttonChildrenText);
    });

    it("keeps the consumer icon in the DOM but adds the Spinner overlay", async () => {
      const page = await render(Component, {
        ...baseProps,
        loading: true,
        icon: buttonIcon,
      });
      expect(page.container.querySelector(".icon")).not.toBeNull();
      expect(page.container.querySelector(".loading-spinner")).not.toBeNull();
    });

    it("is neither busy nor disabled when not loading", async () => {
      const page = await render(Component, { ...baseProps });
      const root = componentLocator(page).element() as HTMLButtonElement;
      expect(root.hasAttribute("aria-busy")).toBe(false);
      expect(root.hasAttribute("aria-disabled")).toBe(false);
      expect(root.disabled).toBe(false);
    });
  });

  describe("loading status announcement", () => {
    it("renders no status region when loading is not controlled", async () => {
      const page = await render(Component, { ...baseProps });
      expect(page.container.querySelector('[role="status"]')).toBeNull();
    });

    it("renders an empty status region when loading is false", async () => {
      const page = await render(Component, { ...baseProps, loading: false });
      const status = page.container.querySelector('[role="status"]');
      expect(status).not.toBeNull();
      expect(status?.textContent?.trim()).toBe("");
    });

    it("announces the default loading label when loading starts", async () => {
      const page = await render(Component, { ...baseProps, loading: false });
      await page.rerender({ loading: true });
      await expect
        .element(page.getByRole("status"))
        .toHaveTextContent("Loading");
    });

    it("announces a custom loading label", async () => {
      const page = await render(Component, {
        ...baseProps,
        loading: true,
        loadingLabel: "Saving changes",
      });
      await expect
        .element(page.getByRole("status"))
        .toHaveTextContent("Saving changes");
    });

    it("clears the status region when loading ends", async () => {
      const page = await render(Component, { ...baseProps, loading: true });
      await page.rerender({ loading: false });
      const status = page.container.querySelector('[role="status"]');
      expect(status?.textContent?.trim()).toBe("");
    });

    it("renders the status region outside the button", async () => {
      const page = await render(Component, { ...baseProps, loading: true });
      const root = componentLocator(page).element();
      expect(root.querySelector('[role="status"]')).toBeNull();
    });
  });

  describe("activation", () => {
    it("calls onclick when clicked", async () => {
      const onclick = vi.fn();
      const page = await render(Component, { ...baseProps, onclick });
      await componentLocator(page).click();
      expect(onclick).toHaveBeenCalledOnce();
    });

    it("does not call onclick while loading", async () => {
      const onclick = vi.fn();
      const page = await render(Component, {
        ...baseProps,
        onclick,
        loading: true,
      });
      (componentLocator(page).element() as HTMLButtonElement).click();
      expect(onclick).not.toHaveBeenCalled();
    });

    it("does not call onclick when disabled", async () => {
      const onclick = vi.fn();
      const page = await render(Component, {
        ...baseProps,
        onclick,
        disabled: true,
      });
      (componentLocator(page).element() as HTMLButtonElement).click();
      expect(onclick).not.toHaveBeenCalled();
    });

    it("calls onclick again once loading ends", async () => {
      const onclick = vi.fn();
      const page = await render(Component, {
        ...baseProps,
        onclick,
        loading: true,
      });
      await page.rerender({ loading: false });
      await componentLocator(page).click();
      expect(onclick).toHaveBeenCalledOnce();
    });
  });

  describe("form submission", () => {
    // Renders the button inside a form and counts submissions, cancelling
    // each so the test page does not navigate.
    const renderInForm = async (
      props: ComponentProps<typeof Component>,
    ): Promise<{
      page: RenderResult<typeof Component>;
      onsubmit: ReturnType<typeof vi.fn>;
    }> => {
      const form = document.createElement("form");
      const onsubmit = vi.fn((event: Event) => event.preventDefault());
      form.addEventListener("submit", onsubmit);
      document.body.append(form);
      onTestFinished(() => form.remove());
      const page = await render(Component, { props, target: form });
      return { page, onsubmit };
    };

    it("submits its form by default (native type is submit)", async () => {
      const { page, onsubmit } = await renderInForm({ ...baseProps });
      await componentLocator(page).click();
      expect(onsubmit).toHaveBeenCalledOnce();
    });

    it("does not submit its form with type button", async () => {
      const { page, onsubmit } = await renderInForm({
        ...baseProps,
        type: "button",
      });
      await componentLocator(page).click();
      expect(onsubmit).not.toHaveBeenCalled();
    });

    it("does not submit its form while loading", async () => {
      const { page, onsubmit } = await renderInForm({
        ...baseProps,
        loading: true,
      });
      (componentLocator(page).element() as HTMLButtonElement).click();
      expect(onsubmit).not.toHaveBeenCalled();
    });
  });

  describe("density context", () => {
    it("keeps the label centred in a widened button", async () => {
      const context = document.createElement("div");
      context.className = "app";
      document.body.append(context);
      onTestFinished(() => context.remove());
      const page = await render(Component, {
        props: { ...baseProps, style: "width: 300px;" },
        target: context,
      });
      const root = componentLocator(page).element().getBoundingClientRect();
      const label = page.container
        .querySelector(".label")
        ?.getBoundingClientRect();
      expect(label).toBeDefined();
      const rootCentre = root.left + root.width / 2;
      const labelCentre = (label?.left ?? 0) + (label?.width ?? 0) / 2;
      expect(Math.abs(rootCentre - labelCentre)).toBeLessThan(1);
    });
  });

  describe("density context", () => {
    it("keeps the label centred in a widened button", async () => {
      const context = document.createElement("div");
      context.className = "app";
      document.body.append(context);
      onTestFinished(() => context.remove());
      const page = await render(Component, {
        props: { ...baseProps, style: "width: 300px;" },
        target: context,
      });
      const root = componentLocator(page).element().getBoundingClientRect();
      const label = page.container
        .querySelector(".label")
        ?.getBoundingClientRect();
      expect(label).toBeDefined();
      const rootCentre = root.left + root.width / 2;
      const labelCentre = (label?.left ?? 0) + (label?.width ?? 0) / 2;
      expect(Math.abs(rootCentre - labelCentre)).toBeLessThan(1);
    });
  });

  describe("border visibility", () => {
    // A red border colour on every channel makes the outline flag the only
    // thing deciding whether the border shows.
    const redBorder =
      "--modifier-color-border: rgb(255, 0, 0); --modifier-color-border-disabled: rgb(255, 0, 0);";

    const borderAlpha = (page: RenderResult<typeof Component>): number => {
      const probe = document.createElement("div");
      probe.style.color = getComputedStyle(
        componentLocator(page).element(),
      ).borderTopColor;
      document.body.append(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      const alpha = resolved.match(/[\d.]+(?=\)$)/)?.[0];
      return resolved.includes("/") || resolved.startsWith("rgba")
        ? Number(alpha)
        : 1;
    };

    for (const state of ["enabled", "disabled", "loading"] as const) {
      const stateProps = {
        enabled: {},
        disabled: { disabled: true },
        loading: { loading: true },
      }[state];

      it(`hides the border when ${state} and the importance has no outline`, async () => {
        const page = await render(Component, {
          ...baseProps,
          ...stateProps,
          style: `${redBorder} --modifier-outline: 0;`,
        });
        expect(borderAlpha(page)).toBe(0);
      });

      it(`shows the border when ${state} and the importance has an outline`, async () => {
        const page = await render(Component, {
          ...baseProps,
          ...stateProps,
          style: `${redBorder} --modifier-outline: 1;`,
        });
        expect(borderAlpha(page)).toBe(1);
      });
    }
  });

  describe("HTML attributes", () => {
    it("passes through HTML button attributes", async () => {
      const page = await render(Component, {
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
      const page = await render(Component, { ...baseProps, id: "my-button" });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("id", "my-button");
    });

    it("applies style prop", async () => {
      const page = await render(Component, {
        ...baseProps,
        style: "color: red;",
      });
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
