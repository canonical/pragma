import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./SideNavigation.svelte";
import type { NavItem } from "./types.js";

const root: NavItem = {
  key: "root",
  items: [
    {
      key: "product",
      label: "Product",
      items: [
        { url: "/dashboard", label: "Dashboard" },
        {
          key: "settings",
          label: "Settings",
          items: [{ url: "/settings/general", label: "General" }],
        },
      ],
    },
  ],
};

describe("SideNavigation SSR", () => {
  const baseProps = { root } satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders a navigation landmark", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(componentLocator(page).tagName).toBe("NAV");
    });
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
        props: { class: "test-class", ...baseProps },
      });
      expect(componentLocator(page).classList).toContain("test-class");
      expect(componentLocator(page).classList).toContain("ds");
      expect(componentLocator(page).classList).toContain("side-navigation");
    });
  });

  it("renders top-level items but not collapsed subitems", () => {
    const page = render(Component, { props: { ...baseProps } });
    const text = componentLocator(page).textContent ?? "";
    expect(text).toContain("Dashboard");
    expect(text).toContain("Settings");
    expect(text).not.toContain("General");
  });

  it("does not render content while collapsed, by default", () => {
    const page = render(Component, {
      props: { ...baseProps, expanded: false },
    });
    const text = componentLocator(page).textContent ?? "";
    expect(text).not.toContain("Dashboard");
  });
});

function componentLocator(page: ReturnType<typeof render>): HTMLElement {
  return page.container.querySelector(".ds.side-navigation") as HTMLElement;
}
