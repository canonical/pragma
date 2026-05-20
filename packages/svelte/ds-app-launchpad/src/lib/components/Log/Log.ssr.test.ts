/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Log.svelte";
import { logs, logsProps, oneLog, oneLogProps } from "./test.fixtures.svelte";

describe("Log SSR", () => {
  const baseProps = {
    caption: "Log Component",
  } satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(componentLocator(page)).toBeInstanceOf(
        page.window.HTMLTableElement,
      );
    });

    it.each([
      "Line",
      "Timestamp",
      "Content",
    ])("renders column header %s", (header) => {
      const page = render(Component, { props: { ...baseProps } });
      expect(columnHeaderLocator(page, header)).toBeInstanceOf(
        page.window.HTMLTableCellElement,
      );
    });

    it("doesn't render timestamp column when hideTimestamps is true", () => {
      const page = render(Component, {
        props: { ...baseProps, hideTimestamps: true },
      });
      expect(
        page.queryByRole("columnheader", { name: "Timestamp" }),
      ).toBeNull();
    });
  });

  describe("attributes", () => {
    it.each([["id", "test-id"]])("applies %s", (attribute, expected) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: expected },
      });
      expect(componentLocator(page).getAttribute(attribute)).toBe(expected);
    });

    it("applies aria-label", () => {
      const page = render(Component, {
        props: { ...baseProps, "aria-label": "custom-aria-label" },
      });
      expect(
        page
          .getByRole("table", { name: "custom-aria-label" })
          .getAttribute("aria-label"),
      ).toBe("custom-aria-label");
    });

    it("applies classes", () => {
      const page = render(Component, {
        props: { class: "test-class", ...baseProps },
      });
      expect(componentLocator(page).classList).toContain("test-class");
      expect(componentLocator(page).classList).toContain("ds");
      expect(componentLocator(page).classList).toContain("log");
    });

    it("applies style", () => {
      const page = render(Component, {
        props: { style: "color: orange;", ...baseProps },
      });
      expect(componentLocator(page).style.color).toBe("orange");
    });
  });

  describe("rows", () => {
    it("renders log line", () => {
      const page = render(Component, {
        props: { ...baseProps, children: oneLog },
      });
      expect(page.getAllByRole("row")).toHaveLength(2); // 1 header + 1 log line
      expect(
        page.getByRole("rowheader", { name: oneLogProps.line.toString() }),
      ).toBeInstanceOf(page.window.HTMLTableCellElement);
      expect(page.getByText(oneLogProps.message)).toBeInstanceOf(
        page.window.HTMLTableCellElement,
      );
      expect(page.getByRole("time").getAttribute("datetime")).toBe(
        new Date(oneLogProps.timestamp).toISOString(),
      );
    });

    it("renders multiple log lines", () => {
      const page = render(Component, {
        props: { ...baseProps, children: logs },
      });
      expect(page.getAllByRole("row")).toHaveLength(logsProps.length + 1);
      logsProps.forEach((log) => {
        expect(
          page.getByRole("rowheader", { name: log.line.toString() }),
        ).toBeInstanceOf(page.window.HTMLTableCellElement);
        expect(page.getByText(log.message)).toBeInstanceOf(
          page.window.HTMLTableCellElement,
        );
      });
      expect(page.getAllByRole("time")).toHaveLength(logsProps.length);
    });

    it("doesn't render timestamps when hideTimestamps is true", () => {
      const page = render(Component, {
        props: { ...baseProps, children: logs, hideTimestamps: true },
      });
      expect(page.getAllByRole("row")).toHaveLength(logsProps.length + 1);
      expect(page.queryByRole("time")).toBeNull();
    });
  });

  describe("timestampFormatter", () => {
    const customFormatter = {
      format: (date: Date) => date.getTime().toString(),
    };

    it("uses custom formatter for timestamp text content", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children: oneLog,
          timestampFormatter: customFormatter,
        },
      });
      const timeElement = page.getByRole("time");
      expect(timeElement.textContent).toBe(
        new Date(oneLogProps.timestamp).getTime().toString(),
      );
    });

    it("still uses ISO format for datetime attribute", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children: oneLog,
          timestampFormatter: customFormatter,
        },
      });
      expect(page.getByRole("time").getAttribute("datetime")).toBe(
        new Date(oneLogProps.timestamp).toISOString(),
      );
    });

    it("uses custom formatter for all log lines", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          children: logs,
          timestampFormatter: customFormatter,
        },
      });
      const timeElements = page.getAllByRole("time");
      expect(timeElements).toHaveLength(logsProps.length);
      logsProps.forEach((log, i) => {
        expect(timeElements[i].textContent).toBe(
          new Date(log.timestamp).getTime().toString(),
        );
      });
    });
  });
});

function componentLocator(page: RenderResult): HTMLElement {
  return page.getByRole("table", { name: "Log Component" });
}

function columnHeaderLocator(page: RenderResult, header: string): HTMLElement {
  return page.getByRole("columnheader", { name: header });
}
