// Ported from @canonical/react-ds-app ApplicationLayout

import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./ApplicationLayout.svelte";

describe("ApplicationLayout component", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => "<span>Test content</span>",
    })),
  } satisfies ComponentProps<typeof Component>;

  it("renders children in the content region", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(page.getByText("Test content")).toBeVisible();
    expect(
      componentRoot(page).querySelector(":scope > .content")?.textContent,
    ).toContain("Test content");
  });

  it("applies the base and custom class to the root", async () => {
    const page = render(Component, {
      ...baseProps,
      class: "custom-class",
    });

    await expect.element(componentRoot(page)).toHaveClass("ds");
    await expect.element(componentRoot(page)).toHaveClass("application-layout");
    await expect.element(componentRoot(page)).toHaveClass("custom-class");
  });

  it("renders the navigation slot in the navigation region", async () => {
    const page = render(Component, {
      ...baseProps,
      navigation: createRawSnippet(() => ({
        render: () => "<span>Nav</span>",
      })),
    });

    await expect.element(page.getByText("Nav")).toBeVisible();
    expect(
      componentRoot(page).querySelector(":scope > .navigation")?.textContent,
    ).toContain("Nav");
    await expect.element(page.getByText("Test content")).toBeVisible();
  });

  it("omits the navigation region when the slot is not provided", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentRoot(page)).toBeInTheDocument();
    expect(
      componentRoot(page).querySelector(":scope > .navigation"),
    ).toBeNull();
  });

  it("passes through additional props", async () => {
    const page = render(Component, {
      ...baseProps,
      "data-testid": "test-component",
    });

    await expect
      .element(page.getByTestId("test-component"))
      .toBeInTheDocument();
  });
});

function componentRoot(page: RenderResult<typeof Component>): HTMLElement {
  return page.container.firstElementChild as HTMLElement;
}
