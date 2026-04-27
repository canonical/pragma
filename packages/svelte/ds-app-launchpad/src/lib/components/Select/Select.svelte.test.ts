/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Select.svelte";

describe("Select component", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => `<option value="1">Option 1</option>`,
    })),
    "data-testid": "select-root",
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(selectLocator(page)).toBeVisible();
    await expect
      .element(page.getByRole("option"))
      .toHaveTextContent("Option 1");
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, expected) => {
      const page = render(Component, { ...baseProps, [attribute]: expected });
      await expect
        .element(selectLocator(page))
        .toHaveAttribute(attribute, expected);
    });

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      const wrapper = componentLocator(page).element();
      await expect.element(wrapper).toHaveClass("test-class");
      await expect.element(wrapper).toHaveClass("ds");
      await expect.element(wrapper).toHaveClass("select");
    });

    it("applies style", async () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      await expect.element(selectLocator(page)).toHaveStyle("color: orange;");
    });
  });

  it("renders when multiple is true", async () => {
    const page = render(Component, { ...baseProps, multiple: true });
    await expect.element(page.getByRole("listbox")).toHaveAttribute("multiple");
    await expect
      .element(page.getByRole("option"))
      .toHaveTextContent("Option 1");
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("select-root");
}

function selectLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("combobox");
}
