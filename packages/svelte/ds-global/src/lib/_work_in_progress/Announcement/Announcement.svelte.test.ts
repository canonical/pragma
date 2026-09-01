import type { Locator } from "@vitest/browser/context";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Announcement.svelte";

describe("Announcement component", () => {
  const baseProps = {
    "data-testid": "announcement",
    children: createRawSnippet(() => ({
      render: () => `<span>Announcement content</span>`,
    })),
  } satisfies ComponentProps<typeof Component>;

  it("renders content", async () => {
    const page = render(Component, { ...baseProps });
    await expect
      .element(page.getByText("Announcement content"))
      .toBeInTheDocument();
  });

  it("renders an optional heading as string", async () => {
    const page = render(Component, {
      ...baseProps,
      heading: "System Maintenance",
    });
    await expect.element(page.getByText("System Maintenance")).toBeVisible();
  });

  it("renders an optional heading as snippet", async () => {
    const page = render(Component, {
      ...baseProps,
      heading: createRawSnippet(() => ({
        render: () => `<strong>Bold Heading</strong>`,
      })),
    });
    await expect.element(page.getByText("Bold Heading")).toBeVisible();
  });

  it("omits the heading element when heading is not provided", async () => {
    const page = render(Component, { ...baseProps });
    const root = componentLocator(page).element();
    expect(root.querySelector(".heading")).toBeNull();
  });

  it("applies the criticality modifier class", async () => {
    const page = render(Component, { ...baseProps, criticality: "error" });
    await expect.element(componentLocator(page)).toHaveClass("error");
  });

  it("defaults criticality to information", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toHaveClass("information");
  });

  it("renders a decorative icon element with aria-hidden", async () => {
    const page = render(Component, { ...baseProps });
    const root = componentLocator(page).element();
    const icon = root.querySelector(".icon");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, expected) => {
      const page = render(Component, { ...baseProps, [attribute]: expected });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, expected);
    });

    it("applies custom class", async () => {
      const page = render(Component, {
        ...baseProps,
        class: "custom-class",
      });
      await expect
        .element(componentLocator(page))
        .toHaveClass("custom-class", "ds", "announcement");
    });

    it("applies style", async () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      await expect
        .element(componentLocator(page))
        .toHaveStyle({ color: "orange" });
    });

    it("passes through additional props", async () => {
      const page = render(Component, { ...baseProps });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("data-testid", "announcement");
    });
  });
});

// Selects the component root by the testid set in baseProps.
function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("announcement");
}
