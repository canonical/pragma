/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./TitleRow.svelte";

describe("TitleRow component", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => "<span>Title Row Content</span>",
    })),
    date: createRawSnippet(() => ({
      render: () => "<span>2023-03-15</span>",
    })),
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, baseProps);
    await expect.element(componentLocator(page)).toBeInTheDocument();
    await expect
      .element(page.getByText("Title Row Content"))
      .toBeInTheDocument();
  });

  it("renders leadingText", async () => {
    const page = render(Component, {
      ...baseProps,
      leadingText: "Leading Text",
    });
    await expect.element(page.getByText("Leading Text")).toBeInTheDocument();
  });

  describe("Basic attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, value) => {
      const page = render(Component, { ...baseProps, [attribute]: value });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, value);
    });

    it("applies style", async () => {
      const page = render(Component, { ...baseProps, style: "color: orange;" });
      await expect
        .element(componentLocator(page))
        .toHaveStyle("color: orange;");
    });

    it("applies class", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      const element = componentLocator(page);
      await expect.element(element).toHaveClass("ds");
      await expect.element(element).toHaveClass("timeline-title-row");
      await expect.element(element).toHaveClass("test-class");
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("title-row");
}
