/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Select.svelte";

describe("Select SSR", () => {
  const baseProps = {
    children: createRawSnippet(() => ({
      render: () => `<option value="1">Option 1</option>`,
    })),
    "data-testid": "select-root",
  } satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
        },
      });
      expect(selectLocator(page)).toBeInstanceOf(page.window.HTMLSelectElement);
      expect(page.getByRole("option").textContent).toBe("Option 1");
    });
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, expected) => {
      const page = render(Component, {
        props: {
          ...baseProps,
          [attribute]: expected,
        },
      });
      expect(selectLocator(page).getAttribute(attribute)).toBe(expected);
    });

    it("applies classes", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          class: "test-class",
        },
      });
      const wrapper = componentLocator(page);
      expect(wrapper.classList).toContain("test-class");
      expect(wrapper.classList).toContain("ds");
      expect(wrapper.classList).toContain("select");
    });

    it("applies style", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          style: "color: orange;",
        },
      });
      expect(selectLocator(page).style.color).toBe("orange");
    });
  });

  it("renders when multiple is true", () => {
    const page = render(Component, {
      props: {
        ...baseProps,
        multiple: true,
      },
    });
    expect(page.getByRole<HTMLSelectElement>("listbox").multiple).toBe(true);
    expect(page.getByRole("option").textContent).toBe("Option 1");
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.getByTestId("select-root");
}

function selectLocator(page: RenderResult): HTMLSelectElement {
  return page.getByRole("combobox");
}
