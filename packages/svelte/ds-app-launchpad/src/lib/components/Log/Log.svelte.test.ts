/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import { page as pageContext } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./Log.svelte";
import { logs, logsProps, oneLog, oneLogProps } from "./test.fixtures.svelte";

describe("Log component", () => {
  const baseProps = {
    caption: "Log Component",
  } satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("renders", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(componentLocator(page)).toBeInTheDocument();
    });

    it.each([
      "Line",
      "Timestamp",
      "Content",
    ])("renders column header %s", async (header) => {
      const page = render(Component, { ...baseProps });
      await expect
        .element(columnHeaderLocator(page, header))
        .toBeInTheDocument();
    });

    it("doesn't render timestamp column when hideTimestamps is true", async () => {
      const page = render(Component, {
        ...baseProps,
        hideTimestamps: true,
      });
      await expect
        .element(page.getByRole("columnheader", { name: "Timestamp" }).query())
        .toBeNull();
    });
  });

  describe("attributes", () => {
    it.each([["id", "test-id"]])("applies %s", async (attribute, expected) => {
      const page = render(Component, {
        ...baseProps,
        [attribute]: expected,
      });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute(attribute, expected);
    });

    it("applies aria-label", async () => {
      const page = render(Component, {
        ...baseProps,
        "aria-label": "custom-aria-label",
      });
      await expect
        .element(page.getByRole("table", { name: "custom-aria-label" }))
        .toHaveAttribute("aria-label", "custom-aria-label");
    });

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      await expect.element(componentLocator(page)).toHaveClass("test-class");
      await expect.element(componentLocator(page)).toHaveClass("ds");
      await expect.element(componentLocator(page)).toHaveClass("log");
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

  describe("rows", () => {
    it("renders log line", async () => {
      const page = render(Component, {
        ...baseProps,
        children: oneLog,
      });
      pageContext.viewport(1000, 800);

      expect(page.getByRole("row").elements()).toHaveLength(2); // 1 header + 1 log line

      await expect
        .element(
          page.getByRole("rowheader", { name: oneLogProps.line.toString() }),
        )
        .toBeInTheDocument();
      await expect.element(page.getByText(oneLogProps.message)).toBeVisible();

      const timeElement = page.getByRole("time");
      await expect.element(timeElement).toBeVisible();
      await expect
        .element(timeElement)
        .toHaveAttribute(
          "datetime",
          new Date(oneLogProps.timestamp).toISOString(),
        );
    });

    it("renders multiple log lines", async () => {
      const page = render(Component, {
        ...baseProps,
        children: logs,
      });

      pageContext.viewport(1000, 800);

      const rows = page.getByRole("row").elements();
      expect(rows).toHaveLength(logsProps.length + 1);

      for (const log of logsProps) {
        await expect
          .element(page.getByRole("rowheader", { name: log.line.toString() }))
          .toBeInTheDocument();
        await expect.element(page.getByText(log.message)).toBeVisible();
      }

      expect(page.getByRole("time").elements()).toHaveLength(logsProps.length);
    });

    it("doesn't render timestamps when hideTimestamps is true", async () => {
      const page = render(Component, {
        ...baseProps,
        children: logs,
        hideTimestamps: true,
      });

      pageContext.viewport(1000, 800);

      expect(page.getByRole("row").elements()).toHaveLength(
        logsProps.length + 1,
      );

      expect(page.getByRole("time").query()).toBeNull();
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("table", { name: "Log Component" });
}

function columnHeaderLocator(
  page: RenderResult<typeof Component>,
  header: string,
): Locator {
  return page.getByRole("columnheader", { name: header, includeHidden: true });
}
