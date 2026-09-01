import type { Locator } from "@vitest/browser/context";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Section.svelte";

describe("Section component", () => {
  const baseProps = {
    "data-testid": "section",
    children: createRawSnippet(() => ({
      render: () => `<span>Section content</span>`,
    })),
  } satisfies ComponentProps<typeof Component>;

  it("renders content", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(page.getByText("Section content")).toBeInTheDocument();
  });

  it("renders as a section element", async () => {
    const page = render(Component, { ...baseProps });
    const root = componentLocator(page).element();
    expect(root.tagName).toBe("SECTION");
  });

  it("applies the ds section classes", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toHaveClass("ds", "section");
  });

  it("applies the bordered class when bordered", async () => {
    const page = render(Component, { ...baseProps, bordered: true });
    await expect.element(componentLocator(page)).toHaveClass("bordered");
  });

  it("omits the bordered class by default", async () => {
    const page = render(Component, { ...baseProps });
    const root = componentLocator(page).element();
    expect(root.classList.contains("bordered")).toBe(false);
  });

  it("applies the spacing modifier class", async () => {
    const page = render(Component, { ...baseProps, spacing: "hero" });
    await expect.element(componentLocator(page)).toHaveClass("hero");
  });

  it("applies a custom class", async () => {
    const page = render(Component, { ...baseProps, class: "test-class" });
    await expect
      .element(componentLocator(page))
      .toHaveClass("test-class", "ds", "section");
  });

  it("passes through additional props", async () => {
    const page = render(Component, { ...baseProps });
    await expect
      .element(componentLocator(page))
      .toHaveAttribute("data-testid", "section");
  });
});

// Selects the component root by the testid set in baseProps.
function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("section");
}
