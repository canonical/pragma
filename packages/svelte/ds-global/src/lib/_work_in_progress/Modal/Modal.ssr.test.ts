import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { assert, describe, expect, it } from "vitest";
import Component from "./Modal.svelte";
import {
  children,
  commandCloseButtonText,
  contentText,
  dismissButtonText,
  titleText,
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
    it.each<[string, unknown, string?]>([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
      ["open", true, ""],
    ])("applies %s", (attribute, set, expected) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: set },
      });
      expect(componentLocator(page).getAttribute(attribute)).toBe(
        expected ?? set,
      );
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

    it("renders the non-modal backdrop only when open", () => {
      const closed = render(Component, { props: baseProps });
      expect(
        closed.container.querySelector(".modal-non-modal-backdrop"),
      ).toBeNull();

      const open = render(Component, { props: { ...baseProps, open: true } });
      expect(
        open.container.querySelector(".modal-non-modal-backdrop"),
      ).not.toBeNull();
    });
  });

  describe("Accessibility", () => {
    it("points aria-labelledby at the header's title", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children,
          open: true,
        },
      });
      expect(page.getByRole("dialog", { name: titleText })).toBeInstanceOf(
        page.window.HTMLDialogElement,
      );
    });

    it("drops aria-labelledby when aria-label is set", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children,
          "aria-label": "Custom name",
        },
      });
      expect(componentLocator(page).hasAttribute("aria-labelledby")).toBe(
        false,
      );
    });

    it("keeps an explicit aria-labelledby", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children,
          "aria-labelledby": "custom-label",
        },
      });
      expect(componentLocator(page).getAttribute("aria-labelledby")).toBe(
        "custom-label",
      );
    });
  });

  describe("Declarative controls", () => {
    it.each([
      ["children controls", commandCloseButtonText],
      ["the header's close button", dismissButtonText],
    ])("properly links %s with modal", (_, buttonText) => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children,
        },
      });
      const modalId = componentLocator(page).getAttribute("id");
      assert(modalId !== null);
      const closeButton = page.getByRole("button", {
        name: buttonText,
        hidden: true,
      });
      expect(closeButton.getAttribute("commandfor")).toBe(modalId);
      expect(closeButton.getAttribute("command")).toBe("close");
    });
  });

  describe("closedby", () => {
    it("defaults to closerequest", () => {
      const page = render(Component, { props: baseProps });
      expect(componentLocator(page).getAttribute("closedby")).toBe(
        "closerequest",
      );
    });

    it.each(["any", "closerequest", "none"] as const)(
      "renders as %s when set",
      (closedby) => {
        const page = render(Component, {
          props: {
            ...baseProps,
            closedby,
          },
        });
        expect(componentLocator(page).getAttribute("closedby")).toBe(closedby);
      },
    );
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.getByRole("dialog", { hidden: true });
}
