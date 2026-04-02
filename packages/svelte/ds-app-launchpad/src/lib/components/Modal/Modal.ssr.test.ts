/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { assert, describe, expect, it } from "vitest";
import Component from "./Modal.svelte";
import {
  children,
  closeButtonText,
  contentText,
  trigger,
  triggerText,
} from "./test.fixtures.svelte";

describe("Modal SSR", () => {
  const baseProps = {} satisfies ComponentProps<typeof Component>;

  it("doesn't throw", () => {
    expect(() => {
      render(Component, { props: { ...baseProps } });
    }).not.toThrow();
  });

  it("renders", () => {
    const page = render(Component, { props: { ...baseProps } });
    expect(componentLocator(page)).toBeInstanceOf(
      page.window.HTMLDialogElement,
    );
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, expected) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: expected },
      });
      expect(componentLocator(page).getAttribute(attribute)).toBe(expected);
    });

    it("applies classes", () => {
      const page = render(Component, {
        props: { ...baseProps, class: "test-class" },
      });
      expect(componentLocator(page).classList).toContain("test-class");
      expect(componentLocator(page).classList).toContain("ds");
      expect(componentLocator(page).classList).toContain("modal");
    });

    it("applies style", () => {
      const page = render(Component, {
        props: { ...baseProps, style: "color: orange;" },
      });
      expect(componentLocator(page).style.color).toBe("orange");
    });
  });

  describe("basics", () => {
    it("renders children", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children,
        },
      });
      expect(page.getByText(contentText)).toBeDefined();
    });

    it("renders trigger", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          trigger,
        },
      });
      expect(triggerLocator(page)).toBeDefined();
    });
  });

  describe("Declarative controls", () => {
    it("properly links trigger with modal", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          trigger,
        },
      });
      const modalId = componentLocator(page).getAttribute("id");
      assert(modalId !== null);
      expect(triggerLocator(page).getAttribute("commandfor")).toBe(modalId);
      expect(triggerLocator(page).getAttribute("command")).toBe("show-modal");
      expect(triggerLocator(page).getAttribute("aria-haspopup")).toBe("dialog");
    });

    it("properly links children controls with modal", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children,
        },
      });
      const modalId = componentLocator(page).getAttribute("id");
      assert(modalId !== null);
      const closeButton = page.getByRole("button", {
        name: closeButtonText,
        hidden: true,
      });
      expect(closeButton.getAttribute("commandfor")).toBe(modalId);
      expect(closeButton.getAttribute("command")).toBe("close");
    });
  });

  describe("closedby", () => {
    it("renders as any if `closeOnOutsideClick` is true", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          closeOnOutsideClick: true,
        },
      });
      expect(componentLocator(page).getAttribute("closedby")).toBe("any");
    });

    it("renders as closerequest if `closeOnOutsideClick` is false", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          closeOnOutsideClick: false,
        },
      });
      expect(componentLocator(page).getAttribute("closedby")).toBe(
        "closerequest",
      );
    });
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.getByRole("dialog", { hidden: true });
}

function triggerLocator(page: RenderResult): HTMLElement {
  return page.getByRole("button", { name: triggerText });
}
