/* @canonical/generator-ds 0.17.1 */

import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./SideNavigation.svelte";
import { children, expandToggle, footer, logo } from "./test.fixtures.svelte";

describe("SideNavigation component", () => {
  const baseProps = {
    children,
    logo,
    expandToggle,
    footer,
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, baseProps);
    await expect.element(componentLocator(page)).toBeInTheDocument();
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, value) => {
      const page = render(Component, {
        ...baseProps,
        [attribute]: value,
      });

      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, value);
    });

    it("applies style", async () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      await expect
        .element(componentLocator(page))
        .toHaveStyle("color: orange;");
    });

    it("applies class", async () => {
      const page = render(Component, {
        ...baseProps,
        class: "test-class",
      });
      const element = componentLocator(page);
      await expect.element(element).toHaveClass("ds");
      await expect.element(element).toHaveClass("side-navigation");
      await expect.element(element).toHaveClass("test-class");
    });
  });

  describe("contents", () => {
    describe("while expanded", () => {
      it("renders logo", async () => {
        const page = render(Component, {
          ...baseProps,
          expanded: true,
        });
        await expect
          .element(page.getByRole("link", { name: "Logo link" }))
          .toBeVisible();
      });

      it("renders children", async () => {
        const page = render(Component, {
          ...baseProps,
          expanded: true,
        });
        await expect.element(page.getByRole("navigation")).toBeVisible();
        await expect
          .element(page.getByRole("button", { name: "Button in nav" }))
          .toBeVisible();
        await expect
          .element(page.getByRole("link", { name: "Link in nav" }))
          .toBeVisible();
      });

      it("renders expand toggle", async () => {
        const page = render(Component, {
          ...baseProps,
          expanded: true,
        });

        const expandToggle = page.getByRole("button", {
          name: "Collapse navigation",
        });
        await expect.element(expandToggle).toBeVisible();
        await expect
          .element(expandToggle)
          .toHaveAttribute("aria-expanded", "true");

        const navigation = page.getByRole("navigation").element();
        await expect
          .element(expandToggle)
          .toHaveAttribute("aria-controls", navigation.id);
      });

      it("renders footer", async () => {
        const page = render(Component, {
          ...baseProps,
          expanded: true,
        });
        await expect
          .element(page.getByRole("button", { name: "Button in footer" }))
          .toBeVisible();
        await expect
          .element(page.getByRole("link", { name: "Link in footer" }))
          .toBeVisible();
      });
    });

    describe("while collapsed", () => {
      it("renders logo", async () => {
        const page = render(Component, {
          ...baseProps,
          expanded: false,
        });
        await expect
          .element(page.getByRole("link", { name: "Logo link" }))
          .toBeVisible();
      });

      it("renders expand toggle", async () => {
        const page = render(Component, {
          ...baseProps,
          expanded: false,
        });

        const expandToggle = page.getByRole("button", {
          name: "Expand navigation",
        });
        await expect.element(expandToggle).toBeVisible();
        await expect
          .element(expandToggle)
          .toHaveAttribute("aria-expanded", "false");

        expect(
          expandToggle.element().getAttribute("aria-controls"),
        ).toBeTruthy();
      });

      it("does not render children", async () => {
        const page = render(Component, {
          ...baseProps,
          expanded: false,
        });
        await expect
          .element(page.getByRole("navigation"))
          .not.toBeInTheDocument();
      });

      it("renders footer", async () => {
        const page = render(Component, {
          ...baseProps,
          expanded: false,
        });
        await expect
          .element(page.getByRole("button", { name: "Button in footer" }))
          .toBeVisible();
        await expect
          .element(page.getByRole("link", { name: "Link in footer" }))
          .toBeVisible();
      });
    });
  });

  it("toggles between expanded and collapsed states", async () => {
    const props = $state({ ...baseProps, expanded: false });
    const page = render(Component, props);

    const expandToggle = page.getByRole("button", {
      name: "Expand navigation",
    });
    await expect
      .element(expandToggle)
      .toHaveAttribute("aria-expanded", "false");
    await expect.element(page.getByRole("navigation")).not.toBeInTheDocument();

    props.expanded = true;
    await expect
      .element(page.getByRole("button", { name: "Collapse navigation" }))
      .toHaveAttribute("aria-expanded", "true");
    await expect.element(page.getByRole("navigation")).toBeInTheDocument();

    props.expanded = false;
    await expect
      .element(page.getByRole("button", { name: "Expand navigation" }))
      .toHaveAttribute("aria-expanded", "false");
    await expect.element(page.getByRole("navigation")).not.toBeInTheDocument();
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("banner");
}
