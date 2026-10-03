import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Badge.svelte";
import Wrapper from "./BadgeTestWrapper.svelte";

describe("Badge component", () => {
  const baseProps = {
    value: 42,
    "data-testid": "badge",
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toBeInTheDocument();
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

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      await expect.element(componentLocator(page)).toHaveClass("test-class");
      await expect.element(componentLocator(page)).toHaveClass("ds");
      await expect.element(componentLocator(page)).toHaveClass("badge");
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

    describe("disabled state", () => {
      it("applies the disabled background color", async () => {
        const page = render(Wrapper);
        const badgeElement = await page.getByTestId("badge").element();

        expect(getComputedStyle(badgeElement).backgroundColor).toBe(
          "rgb(1, 2, 3)",
        );
      });
    });
  });

  describe("Display value", () => {
    it("displays the rounded variant by default", async () => {
      const page = render(Component, { ...baseProps, value: 10000 });
      await expect.element(componentLocator(page)).toHaveTextContent("10K");
    });

    describe("capped", () => {
      it("displays 0 for negative values", async () => {
        const page = render(Component, {
          ...baseProps,
          value: -1,
          capped: true,
        });
        await expect.element(componentLocator(page)).toHaveTextContent("0");
      });

      it("rounds to the nearest integer", async () => {
        const page = render(Component, {
          ...baseProps,
          value: 42.6,
          capped: true,
        });
        await expect.element(componentLocator(page)).toHaveTextContent("43");
      });

      it("displays the values up to 999", async () => {
        const page = render(Component, {
          ...baseProps,
          value: 999,
          capped: true,
        });
        await expect.element(componentLocator(page)).toHaveTextContent("999");
      });

      it("caps the value at 999", async () => {
        const page = render(Component, {
          ...baseProps,
          value: 10000,
          capped: true,
        });
        await expect.element(componentLocator(page)).toHaveTextContent("999+");
      });
    });

    describe("rounded", () => {
      it("displays 0 for negative values", async () => {
        const page = render(Component, {
          ...baseProps,
          value: -1,
        });
        await expect.element(componentLocator(page)).toHaveTextContent("0");
      });

      it("rounds to the nearest integer", async () => {
        const page = render(Component, {
          ...baseProps,
          value: 42.6,
        });
        await expect.element(componentLocator(page)).toHaveTextContent("43");
      });

      it.each([
        [0, "0"],
        [42.6, "43"],
        [999, "999"],
        [1_000, "1K"],
        [1_500, "1.5K"],
        [2_500_000, "2.5M"],
        [1_000_000_000, "1B"],
        [1_234_567_890_123, "1.23T"],
      ])("displays %d as %s", async (input, expected) => {
        const page = render(Component, {
          ...baseProps,
          value: input,
        });
        await expect
          .element(componentLocator(page))
          .toHaveTextContent(expected);
      });
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("badge");
}
