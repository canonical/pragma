/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./HiddenEvents.svelte";
import { multipleLinks, oneLink } from "./test.fixtures.svelte";

describe("HiddenEvents SSR", () => {
  const baseProps = {
    numHidden: 888,
  } satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(componentLocator(page)).toBeInstanceOf(page.window.HTMLLIElement);
      expect(componentLocator(page).textContent).toContain("888");
    });
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, value) => {
      const page = render(Component, {
        props: { ...baseProps, numHidden: 0, [attribute]: value },
      });
      expect(componentLocator(page).getAttribute(attribute)).toBe(value);
    });

    it("applies classes", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          numHidden: 0,
          class: "test-class",
        },
      });
      const element = componentLocator(page);
      expect(element.classList).toContain("ds");
      expect(element.classList).toContain("timeline-hidden-events");
      expect(element.classList).toContain("test-class");
    });

    it("applies style", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          numHidden: 0,
          style: "color: orange;",
        },
      });
      expect(componentLocator(page).style.color).toBe("orange");
    });
  });

  describe("Links", () => {
    it("renders child links", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children: oneLink,
        },
      });
      const link = page.getByRole("link");
      expect(link.textContent).toContain("Show more");
      expect(link.getAttribute("href")).toBe("/show-more");
    });

    it("renders multiple child links", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children: multipleLinks,
        },
      });
      const links = page.getAllByRole("link");
      expect(links).toHaveLength(2);
      expect(links[0].textContent).toContain("Show more");
      expect(links[0].getAttribute("href")).toBe("/show-more");
      expect(links[1].textContent).toContain("Show all");
      expect(links[1].getAttribute("href")).toBe("/show-all");
    });
  });
});

function componentLocator(page: RenderResult): HTMLLIElement {
  return page.getByRole("listitem");
}
