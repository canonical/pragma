// Ported from @canonical/react-ds-app ViewLayout

import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./ViewLayout.svelte";

describe("ViewLayout component", () => {
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
    await expect.element(componentRoot(page)).toHaveClass("view-layout");
    await expect.element(componentRoot(page)).toHaveClass("custom-class");
  });

  it("renders the aside slot in the aside region", async () => {
    const page = render(Component, {
      ...baseProps,
      aside: createRawSnippet(() => ({
        render: () => "<span>Detail panel</span>",
      })),
    });

    await expect.element(page.getByText("Detail panel")).toBeVisible();
    expect(
      componentRoot(page).querySelector(":scope > .aside")?.textContent,
    ).toContain("Detail panel");
    await expect.element(page.getByText("Test content")).toBeVisible();
  });

  it("omits the aside region when the slot is not provided", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentRoot(page)).toBeInTheDocument();
    expect(componentRoot(page).querySelector(":scope > .aside")).toBeNull();
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
