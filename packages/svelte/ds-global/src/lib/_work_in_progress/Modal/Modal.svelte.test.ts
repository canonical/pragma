import { type ComponentProps, flushSync } from "svelte";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { Locator } from "vitest/browser";
import { userEvent } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Modal.svelte";
import {
  children,
  closeButtonText,
  commandCloseButtonText,
  contentText,
  dismissButtonText,
  titleText,
} from "./test.fixtures.svelte";

describe("Modal component", () => {
  const baseProps = {
    children,
  } satisfies ComponentProps<typeof Component>;

  function withOpen({
    open: initialOpen,
    ...extra
  }: Partial<ComponentProps<typeof Component>> = {}) {
    let open = $state(initialOpen);
    return {
      ...baseProps,
      ...extra,
      get open() {
        return open;
      },
      set open(value) {
        open = value;
      },
    };
  }

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
      await expect.element(componentLocator(page, true)).toHaveClass("modal");
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

  describe("basics", () => {
    it("renders children", async () => {
      const page = render(Component, {
        ...baseProps,
      });
      await expect
        .element(
          page.getByRole("button", {
            name: closeButtonText,
            includeHidden: true,
          }),
        )
        .toBeInTheDocument();
    });

    it("is hidden by default", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(componentLocator(page, true)).not.toBeVisible();

      await expect
        .element(componentLocator(page, true))
        .not.toHaveAttribute("open");
    });
  });

  describe("Accessibility", () => {
    it("is named by the header's title, excluding its close button", async () => {
      const page = render(Component, { ...baseProps, open: true });
      await expect
        .element(componentLocator(page))
        .toHaveAccessibleName(titleText);
    });

    it("is named by aria-label over the header's title", async () => {
      const page = render(Component, {
        ...baseProps,
        open: true,
        "aria-label": "Custom name",
      });
      await expect
        .element(page.getByRole("dialog", { name: "Custom name" }))
        .toBeVisible();
      await expect
        .element(componentLocator(page))
        .not.toHaveAttribute("aria-labelledby");
    });
  });

  describe("Opening the Modal", () => {
    it("is opened when `showModal` on the dialog element is called", async () => {
      const props = withOpen();
      const page = render(Component, props);
      await expect.element(componentLocator(page, true)).not.toBeVisible();
      expect(props.open).toBe(undefined);

      (componentLocator(page, true).element() as HTMLDialogElement).showModal();
      await expect.element(componentLocator(page)).toBeVisible();
      await expect.element(componentLocator(page)).toHaveAttribute("open");
      await expect.element(page.getByText(contentText)).toBeVisible();
      await expect.poll(() => props.open).toBe(true);
    });

    it("is opened by an invoker button", async () => {
      const props = withOpen({ id: "invoked-modal" });
      const page = render(Component, props);
      await expect.element(componentLocator(page, true)).not.toBeVisible();

      const invoker = document.createElement("button");
      invoker.textContent = "Open Modal";
      invoker.setAttribute("commandfor", "invoked-modal");
      invoker.setAttribute("command", "show-modal");
      document.body.append(invoker);
      onTestFinished(() => invoker.remove());

      await page.getByRole("button", { name: "Open Modal" }).click();
      await expect.element(componentLocator(page)).toBeVisible();
      await expect.element(componentLocator(page)).toHaveAttribute("open");
      await expect.poll(() => props.open).toBe(true);
    });

    it("is opened by setting open to true", async () => {
      const props = withOpen();
      const page = render(Component, props);
      await expect.element(componentLocator(page, true)).not.toBeVisible();
      expect(props.open).toBe(undefined);

      props.open = true;
      await expect.element(componentLocator(page)).toBeVisible();
      await expect.element(componentLocator(page)).toHaveAttribute("open");
      await expect.element(page.getByText(contentText)).toBeVisible();
    });

    it("upgrades a server-rendered open dialog to a true modal on mount", async () => {
      const props = withOpen({ open: true });
      const page = render(Component, props);

      await expect.element(componentLocator(page)).toBeVisible();
      await expect.element(componentLocator(page)).toHaveAttribute("open");
      await expect.element(page.getByText(contentText)).toBeVisible();
      flushSync();
      expect(componentLocator(page).element().matches(":modal")).toBe(true);
    });

    it("does not call onclose during upgrade to modal, but still calls on later real close", async () => {
      const onclose = vi.fn();
      const props = withOpen({ open: true, onclose });
      const page = render(Component, props);

      await expect.element(componentLocator(page)).toBeVisible();
      flushSync();
      expect(componentLocator(page).element().matches(":modal")).toBe(true);
      expect(onclose).not.toHaveBeenCalled();

      (componentLocator(page).element() as HTMLDialogElement).close();
      await expect.element(componentLocator(page, true)).not.toBeVisible();
      await expect.poll(() => props.open).toBe(false);
      expect(onclose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Closing the Modal", () => {
    it("is closed when `close` on the dialog element is called", async () => {
      const props = withOpen({ open: true });
      const page = render(Component, props);

      (componentLocator(page).element() as HTMLDialogElement).close();
      await expect.element(componentLocator(page, true)).not.toBeVisible();
      await expect
        .element(componentLocator(page, true))
        .not.toHaveAttribute("open");
      await expect.poll(() => props.open).toBe(false);
    });

    it.each([
      ["close() supplied via children snippet", closeButtonText],
      ["a `close` command button in children", commandCloseButtonText],
      ["the header's close button", dismissButtonText],
    ])("is closed by %s", async (_, buttonText) => {
      const props = withOpen({ open: true });
      const page = render(Component, props);

      await page.getByRole("button", { name: buttonText }).click();
      await expect.element(componentLocator(page, true)).not.toBeVisible();
      await expect
        .element(componentLocator(page, true))
        .not.toHaveAttribute("open");
      await expect.poll(() => props.open).toBe(false);
    });

    it("is closed by clicking outside the modal when `closedby` is any", async () => {
      const props = withOpen({ open: true, closedby: "any" });
      const page = render(Component, props);

      await componentLocator(page).click({ position: { x: 0, y: -10 } });
      await expect.element(componentLocator(page, true)).not.toBeVisible();
      await expect
        .element(componentLocator(page, true))
        .not.toHaveAttribute("open");
      await expect.poll(() => props.open).toBe(false);
    });

    it.each(["closerequest", "none"] as const)(
      "is not closed by clicking outside the modal when `closedby` is %s",
      async (closedby) => {
        const props = withOpen({ open: true, closedby });
        const page = render(Component, props);

        await componentLocator(page).click({ position: { x: 0, y: -10 } });
        await expect.element(componentLocator(page)).toBeVisible();
        await expect.element(componentLocator(page)).toHaveAttribute("open");
      },
    );

    it("honours `closedby` changed after mount", async () => {
      const page = render(Component, {
        ...baseProps,
        open: true,
        closedby: "closerequest",
      });

      await page.rerender({ closedby: "any" });
      await componentLocator(page).click({ position: { x: 0, y: -10 } });
      await expect.element(componentLocator(page, true)).not.toBeVisible();
    });

    it("is not closed by clicking the modal's own padding", async () => {
      const props = withOpen({ open: true, closedby: "any" });
      const page = render(Component, props);

      await componentLocator(page).click({ position: { x: 2, y: 2 } });
      await expect.element(componentLocator(page)).toBeVisible();
    });

    it("is not closed when a press starts inside and ends outside the modal", async () => {
      const props = withOpen({ open: true, closedby: "any" });
      const page = render(Component, props);

      const dialogEl = componentLocator(page).element() as HTMLDialogElement;
      const rect = dialogEl.getBoundingClientRect();
      page
        .getByText(contentText)
        .element()
        .dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      dialogEl.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          clientX: rect.left,
          clientY: rect.top - 10,
        }),
      );
      await expect.element(componentLocator(page)).toBeVisible();
    });

    it("fires cancel before closing on outside click", async () => {
      const oncancel = vi.fn();
      const props = withOpen({ open: true, closedby: "any", oncancel });
      const page = render(Component, props);

      await componentLocator(page).click({ position: { x: 0, y: -10 } });
      await expect.poll(() => props.open).toBe(false);
      expect(oncancel).toHaveBeenCalledTimes(1);
    });

    it("is not closed by outside click when cancel is prevented", async () => {
      const props = withOpen({
        open: true,
        closedby: "any",
        oncancel: (e) => e.preventDefault(),
      });
      const page = render(Component, props);

      await componentLocator(page).click({ position: { x: 0, y: -10 } });
      await expect.element(componentLocator(page)).toBeVisible();
    });

    it.each(["any", "closerequest"] as const)(
      "is closed by pressing Escape when `closedby` is %s",
      async (closedby) => {
        const props = withOpen({ open: true, closedby });
        const page = render(Component, props);

        await userEvent.keyboard("{Escape}");
        await expect.element(componentLocator(page, true)).not.toBeVisible();
        await expect
          .element(componentLocator(page, true))
          .not.toHaveAttribute("open");
        await expect.poll(() => props.open).toBe(false);
      },
    );

    it("is not closed by pressing Escape when `closedby` is none", async () => {
      const oncancel = vi.fn();
      const props = withOpen({ open: true, closedby: "none", oncancel });
      const page = render(Component, props);

      await userEvent.keyboard("{Escape}");
      await userEvent.keyboard("{Escape}");
      await expect.element(componentLocator(page)).toBeVisible();
      expect(oncancel).not.toHaveBeenCalled();
    });

    it("is closed by setting open to false", async () => {
      const props = withOpen({ open: true });
      const page = render(Component, props);

      props.open = false;
      await expect.element(componentLocator(page, true)).not.toBeVisible();
      await expect
        .element(componentLocator(page, true))
        .not.toHaveAttribute("open");
    });
  });

  describe("Declarative control attributes", () => {
    it.each([
      ["children", commandCloseButtonText],
      ["the header's close button", dismissButtonText],
    ])("passes close props to %s", async (_, buttonText) => {
      const page = render(Component, {
        ...baseProps,
      });
      const modalId = (
        componentLocator(page, true).element() as HTMLDialogElement
      ).id;
      const button = page.getByRole("button", {
        name: buttonText,
        includeHidden: true,
      });

      await expect.element(button).toHaveAttribute("commandfor", modalId);
      await expect.element(button).toHaveAttribute("command", "close");
    });
  });
});

function componentLocator(
  page: RenderResult<typeof Component>,
  includeHidden = false,
): Locator {
  return page.getByRole("dialog", { includeHidden });
}
