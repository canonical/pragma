/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Event.svelte";

describe("Event SSR", () => {
  const children = createRawSnippet(() => ({
    render: () => `<span>Child Content</span>`,
  }));

  const titleRow = createRawSnippet(() => ({
    render: () => `<span>Title Row Content</span>`,
  }));

  const baseProps = {} satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(componentLocator(page)).toBeInstanceOf(page.window.HTMLLIElement);
    });
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, value) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: value },
      });
      expect(componentLocator(page).getAttribute(attribute)).toBe(value);
    });

    it("applies classes", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          class: "test-class",
        },
      });
      const element = componentLocator(page);
      expect(element.classList).toContain("ds");
      expect(element.classList).toContain("timeline-event");
      expect(element.classList).toContain("test-class");
    });

    it("applies style", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          style: "color: orange;",
        },
      });
      expect(componentLocator(page).style.color).toBe("orange");
    });
  });

  describe("Renders", () => {
    it("with children", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children,
        },
      });
      expect(page.getByText("Child Content")).toBeInstanceOf(
        page.window.HTMLElement,
      );
    });

    it("with title row", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          titleRow,
        },
      });
      expect(page.getByText("Title Row Content")).toBeInstanceOf(
        page.window.HTMLElement,
      );
    });

    describe("Marker", () => {
      it("empty", () => {
        const page = render(Component, { props: { ...baseProps } });
        const element = componentLocator(page);
        expect(element.classList).toContain("marker-empty");
      });

      it("small", () => {
        const page = render(Component, {
          props: {
            ...baseProps,
            markerSize: "small",
            marker: { userName: "John Doe" },
          },
        });
        const element = componentLocator(page);
        expect(element.classList).toContain("marker-small");
      });

      it("large", () => {
        const page = render(Component, {
          props: {
            ...baseProps,
            markerSize: "large",
            marker: { userName: "John Doe" },
          },
        });
        const element = componentLocator(page);
        expect(element.classList).toContain("marker-large");
      });
    });
  });
});

function componentLocator(page: RenderResult): HTMLLIElement {
  return page.getByRole("listitem");
}
