/* @canonical/generator-ds 0.17.1 */

import type { ComponentProps } from "svelte";
import { describe, expect, it, vi } from "vitest";
import type { Locator } from "vitest/browser";
import type { RenderResult } from "vitest-browser-svelte";
import { render } from "vitest-browser-svelte";
import Component from "./RelativeDateTime.svelte";

vi.mock("./utils/formatters.js", () => {
  return {
    dateTimeFormatter: new Intl.DateTimeFormat("en-US", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "UTC",
    }),
    relativeTimeFormatter: new Intl.RelativeTimeFormat("en-US", {
      numeric: "auto",
      style: "long",
    }),
  };
});

const date = new Date("2024-01-01T12:00:00Z");
const timestamp = date.getTime();
const dateString = date.toISOString();

describe("RelativeDateTime component", () => {
  const baseProps = {
    date,
  } satisfies ComponentProps<typeof Component>;

  it("renders", async () => {
    const page = render(Component, baseProps);
    await expect.element(componentLocator(page)).toBeInTheDocument();
  });

  describe("basic attributes", () => {
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
      await expect.element(element).toHaveClass("test-class");
    });
  });

  describe("datetime attribute", () => {
    it("applies correct datetime attribute for Date input", async () => {
      const page = render(Component, baseProps);
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("datetime", date.toISOString());
    });

    it("applies correct datetime attribute for timestamp input", async () => {
      const page = render(Component, { ...baseProps, date: timestamp });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("datetime", date.toISOString());
    });

    it("applies correct datetime attribute for date string input", async () => {
      const page = render(Component, { ...baseProps, date: dateString });
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("datetime", date.toISOString());
    });
  });

  describe("Content", () => {
    describe("now label", () => {
      it("renders nowLabel when within nowThreshold", async () => {
        const now = Date.now();
        const page = render(Component, {
          ...baseProps,
          date: now,
          nowThreshold: 999999,
        });
        await expect.element(componentLocator(page)).toHaveTextContent("now");
      });

      it("does not render nowLabel when outside nowThreshold", async () => {
        const now = Date.now();
        const page = render(Component, {
          ...baseProps,
          date: now - 1000,
          nowThreshold: 10,
        });
        await expect
          .element(componentLocator(page))
          .not.toHaveTextContent("now");
      });

      it("renders custom nowLabel when within nowThreshold", async () => {
        const now = Date.now();
        const page = render(Component, {
          ...baseProps,
          date: now,
          nowThreshold: 999999,
          nowLabel: "just now",
        });
        await expect
          .element(componentLocator(page))
          .toHaveTextContent("just now");
      });
    });

    describe("Relative time", () => {
      it("renders relative time when outside nowThreshold", async () => {
        const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 3); // 3 hours ago
        const page = render(Component, {
          ...baseProps,
          date: pastDate,
          nowThreshold: 0,
        });

        await expect
          .element(componentLocator(page))
          .toHaveTextContent("3 hours ago");
      });

      it("updates over time", async () => {
        vi.useFakeTimers();
        const pastDate = new Date(Date.now() - 1000 * 60 * 3); // 3 minutes ago
        const page = render(Component, {
          ...baseProps,
          date: pastDate,
          nowThreshold: 0,
        });

        await expect
          .element(componentLocator(page))
          .toHaveTextContent("3 minutes ago");

        vi.advanceTimersByTime(1000 * 60);
        await expect
          .element(componentLocator(page))
          .toHaveTextContent("4 minutes ago");

        vi.advanceTimersByTime(1000 * 60 * 60);
        await expect
          .element(componentLocator(page))
          .toHaveTextContent("1 hour ago");

        vi.useRealTimers();
      });
    });
  });

  describe("title attribute", () => {
    it("applies formatted date as title", async () => {
      const page = render(Component, baseProps);
      await expect
        .element(componentLocator(page))
        .toHaveAttribute("title", "1/1/24, 12:00 PM");
    });
  });
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
  return page.getByRole("time");
}
