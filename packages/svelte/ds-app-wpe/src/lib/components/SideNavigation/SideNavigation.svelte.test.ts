import type { Locator } from "@vitest/browser/context";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
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
          items: [
            { url: "/settings/general", label: "General" },
            { url: "/settings/members", label: "Members" },
          ],
        },
      ],
    },
    {
      key: "resources",
      items: [{ url: "/docs", label: "Docs" }],
    },
  ],
};

const footerRoot: NavItem = {
  key: "footer-root",
  items: [
    { key: "footer-group", items: [{ url: "/profile", label: "Profile" }] },
  ],
};

describe("SideNavigation component", () => {
  const baseProps = { root, footerRoot } satisfies ComponentProps<
    typeof Component
  >;

  it("renders", async () => {
    const page = render(Component, baseProps);
    await expect.element(componentLocator(page)).toBeInTheDocument();
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, value) => {
      const page = render(Component, { ...baseProps, [attribute]: value });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, value);
    });

    it("applies class", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      const element = componentLocator(page);
      await expect.element(element).toHaveClass("ds", "side-navigation");
      await expect.element(element).toHaveClass("test-class");
    });

    it("defaults aria-label to 'Main navigation'", async () => {
      const page = render(Component, baseProps);
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("aria-label", "Main navigation");
    });
  });

  describe("expand/collapse", () => {
    it("is expanded by default", async () => {
      const page = render(Component, baseProps);
      await expect.element(page.getByText("Dashboard")).toBeVisible();
      await expect
        .element(page.getByRole("button", { name: "Collapse navigation" }))
        .toHaveAttribute("aria-expanded", "true");
    });

    it("hides content, but keeps the footer, while collapsed", async () => {
      const page = render(Component, { ...baseProps, expanded: false });
      await expect.element(page.getByText("Dashboard")).not.toBeInTheDocument();
      await expect.element(page.getByText("Profile")).toBeInTheDocument();
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("data-expanded", "false");
    });

    it("toggles when the collapse toggle is clicked", async () => {
      const page = render(Component, baseProps);
      const toggle = page.getByRole("button", { name: "Collapse navigation" });
      await toggle.click();
      await expect
        .element(page.getByRole("button", { name: "Expand navigation" }))
        .toHaveAttribute("aria-expanded", "false");
      await expect.element(page.getByText("Dashboard")).not.toBeInTheDocument();
    });
  });

  describe("brand", () => {
    it("renders the brand snippet with the expanded state", async () => {
      const brand = createRawSnippet<[{ expanded: boolean }]>((getArgs) => ({
        render: () => {
          const { expanded } = getArgs();
          return `<span>${expanded ? "expanded-brand" : "collapsed-brand"}</span>`;
        },
      }));
      const page = render(Component, { ...baseProps, expanded: false, brand });
      await expect.element(page.getByText("collapsed-brand")).toBeVisible();
    });
  });

  describe("active item", () => {
    it("marks the item matching currentUrl aria-current", async () => {
      const page = render(Component, {
        ...baseProps,
        currentUrl: "/dashboard",
      });
      await expect
        .element(page.getByRole("link", { name: "Dashboard" }))
        .toHaveAttribute("aria-current", "page");
      await expect
        .element(page.getByRole("link", { name: "Docs" }))
        .not.toHaveAttribute("aria-current");
    });

    it("opens the ancestor group of the active subitem", async () => {
      const page = render(Component, {
        ...baseProps,
        currentUrl: "/settings/general",
      });
      await expect.element(page.getByText("General")).toBeVisible();
      await expect
        .element(page.getByRole("button", { name: "Settings" }))
        .toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("expandable items", () => {
    it("starts collapsed, with subitems not rendered", async () => {
      const page = render(Component, baseProps);
      await expect
        .element(page.getByRole("button", { name: "Settings" }))
        .toHaveAttribute("aria-expanded", "false");
      await expect.element(page.getByText("General")).not.toBeInTheDocument();
    });

    it("expands on click, revealing subitems", async () => {
      const page = render(Component, baseProps);
      await page.getByRole("button", { name: "Settings" }).click();
      await expect
        .element(page.getByRole("button", { name: "Settings" }))
        .toHaveAttribute("aria-expanded", "true");
      await expect
        .element(page.getByRole("link", { name: "General" }))
        .toBeVisible();
    });

    it("does not move focus on a mouse-driven expand", async () => {
      const page = render(Component, baseProps);
      const settings = page.getByRole("button", { name: "Settings" });
      await settings.click();
      await expect.element(settings).toHaveFocus();
    });

    it("aligns its icon column with a plain link row at the same depth", async () => {
      // A <button> row picks up nonzero UA-stylesheet default padding that a
      // <a>/<span> row never had — left unreset, that shifts an expandable
      // item's icon/label out of alignment with plain items beside it. The
      // row elements' own left edges are identical either way (padding is
      // inside the box); it's the icon column inside that shifts.
      const page = render(Component, baseProps);
      const settingsIcon = page
        .getByRole("button", { name: "Settings" })
        .element()
        .querySelector(".start");
      const dashboardIcon = page
        .getByRole("link", { name: "Dashboard" })
        .element()
        .querySelector(".start");
      if (!settingsIcon || !dashboardIcon) {
        throw new Error("icon column not found");
      }
      expect(settingsIcon.getBoundingClientRect().left).toBe(
        dashboardIcon.getBoundingClientRect().left,
      );
    });
  });

  describe("keyboard navigation", () => {
    it("ArrowDown moves across sibling items at the same level, never descending into an expanded item's own subitems", async () => {
      const page = render(Component, baseProps);
      // Expand "Settings" first, so its subitems are visible in the DOM.
      await page.getByRole("button", { name: "Settings" }).click();
      await expect.element(page.getByText("General")).toBeVisible();

      await page.getByRole("link", { name: "Dashboard" }).element().focus();
      await userEvent.keyboard("{ArrowDown}");
      // From Dashboard, Down goes to the next TOP-LEVEL sibling (Settings) —
      // not into Settings' now-visible children.
      await expect
        .element(page.getByRole("button", { name: "Settings" }))
        .toHaveFocus();

      await userEvent.keyboard("{ArrowDown}");
      // Settings is the last item of its group — Down crosses the group
      // boundary to the first item of the next group (Docs), still skipping
      // over General/Members entirely.
      await expect
        .element(page.getByRole("link", { name: "Docs" }))
        .toHaveFocus();
    });

    it("ArrowRight expands a collapsed item and focuses its first subitem", async () => {
      const page = render(Component, baseProps);
      await page.getByRole("button", { name: "Settings" }).element().focus();
      await userEvent.keyboard("{ArrowRight}");
      await expect
        .element(page.getByRole("button", { name: "Settings" }))
        .toHaveAttribute("aria-expanded", "true");
      await expect
        .element(page.getByRole("link", { name: "General" }))
        .toHaveFocus();
    });

    it("Enter expands a collapsed item and focuses its first subitem", async () => {
      const page = render(Component, baseProps);
      await page.getByRole("button", { name: "Settings" }).element().focus();
      await userEvent.keyboard("{Enter}");
      await expect
        .element(page.getByRole("link", { name: "General" }))
        .toHaveFocus();
    });

    it("ArrowLeft on a subitem moves focus to its parent item", async () => {
      const page = render(Component, baseProps);
      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("link", { name: "General" }).element().focus();
      await userEvent.keyboard("{ArrowLeft}");
      await expect
        .element(page.getByRole("button", { name: "Settings" }))
        .toHaveFocus();
    });

    it("ArrowLeft on an expanded item collapses it in place", async () => {
      const page = render(Component, baseProps);
      const settings = page.getByRole("button", { name: "Settings" });
      await settings.click();
      await settings.element().focus();
      await userEvent.keyboard("{ArrowLeft}");
      await expect.element(settings).toHaveAttribute("aria-expanded", "false");
      await expect.element(settings).toHaveFocus();
    });

    it("Down within an expanded item's subitems stays among its own siblings", async () => {
      const page = render(Component, baseProps);
      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("link", { name: "General" }).element().focus();
      await userEvent.keyboard("{ArrowDown}");
      await expect
        .element(page.getByRole("link", { name: "Members" }))
        .toHaveFocus();
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("navigation");
}
