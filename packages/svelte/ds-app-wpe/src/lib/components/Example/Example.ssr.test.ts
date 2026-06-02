import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Example.svelte";

describe("Example SSR", () => {
  const baseProps = {
    "data-testid": "example",
  } satisfies ComponentProps<typeof Component>;

  it("renders default content", () => {
    const page = render(Component, { props: { ...baseProps } });

    expect(componentLocator(page)).toBeInstanceOf(page.window.HTMLDivElement);
    expect(page.getByText("Click me")).toBeInstanceOf(
      page.window.HTMLButtonElement,
    );
    expect(page.getByText("Count: 0")).toBeInstanceOf(
      page.window.HTMLParagraphElement,
    );
  });

  describe("attributes", () => {
    it.each<["id" | "aria-label", string]>([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, expected) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: expected },
      });
      const component = componentLocator(page);

      expect(component.getAttribute(attribute)).toBe(expected);
    });

    it("applies classes", () => {
      const page = render(Component, {
        props: { class: "test-class", ...baseProps },
      });
      const component = componentLocator(page);

      expect(component.classList).toContain("test-class");
      expect(component.classList).toContain("workplace");
      expect(component.classList).toContain("example");
    });

    it("applies style", () => {
      const page = render(Component, {
        props: { style: "color: orange;", ...baseProps },
      });
      const component = componentLocator(page);

      expect(component.style.color).toBe("orange");
    });
  });
});

function componentLocator(page: RenderResult): HTMLDivElement {
  return page.getByTestId("example");
}
