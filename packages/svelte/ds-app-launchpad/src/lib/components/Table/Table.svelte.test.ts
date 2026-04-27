/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { ComponentProps } from "svelte";
import { beforeEach, describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import { userEvent } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Table.svelte";
import {
  caption,
  children,
  setSortDirection,
  sortButtonText,
  tdText,
  thText,
} from "./test.fixtures.svelte";

describe("Table component", () => {
  beforeEach(() => {
    setSortDirection(undefined);
  });

  const baseProps = {
    children,
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, { ...baseProps });
    await expect.element(componentLocator(page)).toBeVisible();
    await expect.element(thLocator(page)).toBeVisible();
    await expect.element(tdLocator(page)).toBeVisible();
  });

  describe("attributes", () => {
    it.each([["id", "test-id"]])("applies %s", async (attribute, expected) => {
      const page = render(Component, { ...baseProps, [attribute]: expected });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, expected);
    });

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      await expect.element(componentLocator(page)).toHaveClass("test-class");
      await expect.element(componentLocator(page)).toHaveClass("ds");
      await expect.element(componentLocator(page)).toHaveClass("table");
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
  });

  describe("sort direction", () => {
    it.each([
      "ascending",
      "descending",
    ] as const)("shows sort button when sort direction is %s", async (direction) => {
      setSortDirection(direction);
      const page = render(Component, { ...baseProps });
      await expect.element(sortButtonLocator(page)).toBeVisible();
    });

    it("sort button shown when header cell is hovered", async () => {
      const page = render(Component, { ...baseProps });
      await thLocator(page).hover();
      await expect.element(sortButtonLocator(page)).toBeVisible();
    });

    it("sort button is tabbable into even when not visible", async () => {
      const page = render(Component, { ...baseProps });
      await userEvent.click(page.baseElement);
      await userEvent.tab();
      await expect.element(sortButtonLocator(page)).toHaveFocus();
      await expect.element(sortButtonLocator(page)).toBeVisible();
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("table", { name: caption });
}

function thLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("columnheader", { name: thText });
}

function tdLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("cell", { name: tdText });
}

function sortButtonLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("button", {
    name: sortButtonText,
  });
}
