import type { Locator } from "@vitest/browser/context";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Cards.svelte";

describe("Cards component", () => {
  const baseProps = {
    "data-testid": "cards",
  } satisfies ComponentProps<typeof Component>;

  it("renders with ds cards subgrid classes", async () => {
    const page = render(Component, { ...baseProps });
    await expect
      .element(componentLocator(page))
      .toHaveClass("ds", "cards", "subgrid");
  });

  it("sets --card-span to 1 by default", async () => {
    const page = render(Component, { ...baseProps });
    const el = componentLocator(page).element() as HTMLElement;
    expect(el.style.getPropertyValue("--card-span")).toBe("1");
  });

  it("sets --card-span from cardSpan", async () => {
    const page = render(Component, { ...baseProps, cardSpan: 4 });
    const el = componentLocator(page).element() as HTMLElement;
    expect(el.style.getPropertyValue("--card-span")).toBe("4");
  });

  it("clamps cardSpan to at least 1", async () => {
    const page = render(Component, { ...baseProps, cardSpan: 0 });
    const el = componentLocator(page).element() as HTMLElement;
    expect(el.style.getPropertyValue("--card-span")).toBe("1");
  });

  it("applies custom class", async () => {
    const page = render(Component, { ...baseProps, class: "custom" });
    await expect
      .element(componentLocator(page))
      .toHaveClass("ds", "cards", "custom");
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByTestId("cards");
}
