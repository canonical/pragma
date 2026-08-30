// Ported from @canonical/react-ds-app ContentLayout

import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./ContentLayout.svelte";

describe("ContentLayout component", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => "<span>Card A</span>",
    })),
  } satisfies ComponentProps<typeof Component>;

  it("renders children as direct grid items", async () => {
    const page = render(Component, { ...baseProps });

    await expect.element(page.getByText("Card A")).toBeVisible();
    expect(
      componentRoot(page).querySelector(":scope > span")?.textContent,
    ).toBe("Card A");
  });

  it("applies the base and custom class to the root", async () => {
    const page = render(Component, {
      ...baseProps,
      class: "custom-class",
    });

    await expect.element(componentRoot(page)).toHaveClass("ds");
    await expect.element(componentRoot(page)).toHaveClass("content-layout");
    await expect.element(componentRoot(page)).toHaveClass("custom-class");
  });

  it("uses the fixed-responsive grid preset by default", async () => {
    const page = render(Component, { ...baseProps });

    await expect.element(componentRoot(page)).toHaveClass("grid");
    await expect.element(componentRoot(page)).toHaveClass("responsive");
    expect(componentRoot(page).className).not.toContain("intrinsic");
  });

  it("switches to the intrinsic grid preset via the grid prop", async () => {
    const page = render(Component, {
      ...baseProps,
      grid: "intrinsic",
    });

    await expect.element(componentRoot(page)).toHaveClass("grid");
    await expect.element(componentRoot(page)).toHaveClass("intrinsic");
    expect(componentRoot(page).className).not.toContain("responsive");
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
