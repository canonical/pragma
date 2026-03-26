/* @canonical/generator-ds 0.17.1 */

import type { RenderResult } from "@canonical/svelte-ssr-test";
import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it, vi } from "vitest";
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

describe("RelativeDateTime SSR", () => {
  const baseProps = {
    date,
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
        page.window.HTMLTimeElement,
      );
    });
  });

  describe("Basic attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", (attribute, value) => {
      const page = render(Component, {
        props: { ...baseProps, [attribute]: value },
      });
      const element = componentLocator(page);
      expect(element.getAttribute(attribute)).toBe(value);
    });

    it("applies style", () => {
      const page = render(Component, {
        props: { ...baseProps, style: "color: orange;" },
      });
      const element = componentLocator(page);
      expect(element.getAttribute("style")).toContain("color: orange;");
    });

    it("applies class", () => {
      const page = render(Component, {
        props: { ...baseProps, class: "test-class" },
      });
      const element = componentLocator(page);
      expect(element.classList.contains("test-class")).toBe(true);
    });
  });

  describe("datetime attribute", () => {
    it("applies correct datetime attribute for Date input", () => {
      const page = render(Component, { props: { ...baseProps } });
      const element = componentLocator(page);
      expect(element.getAttribute("datetime")).toBe(date.toISOString());
    });

    it("applies correct datetime attribute for timestamp input", () => {
      const page = render(Component, {
        props: { ...baseProps, date: timestamp },
      });
      const element = componentLocator(page);
      expect(element.getAttribute("datetime")).toBe(date.toISOString());
    });

    it("applies correct datetime attribute for date string input", () => {
      const page = render(Component, {
        props: { ...baseProps, date: dateString },
      });
      const element = componentLocator(page);
      expect(element.getAttribute("datetime")).toBe(date.toISOString());
    });
  });

  describe("Content", () => {
    describe("now label", () => {
      it("renders nowLabel when within nowThreshold", () => {
        const now = Date.now();
        const page = render(Component, {
          props: { ...baseProps, date: now, nowThreshold: 999999 },
        });
        expect(componentLocator(page).textContent).toContain("now");
      });

      it("does not render nowLabel when outside nowThreshold", () => {
        const now = Date.now();
        const page = render(Component, {
          props: { ...baseProps, date: now - 1000, nowThreshold: 10 },
        });
        expect(componentLocator(page).textContent).not.toContain("now");
      });

      it("renders custom nowLabel when within nowThreshold", () => {
        const now = Date.now();
        const page = render(Component, {
          props: {
            ...baseProps,
            date: now,
            nowThreshold: 999999,
            nowLabel: "just now",
          },
        });
        expect(componentLocator(page).textContent).toContain("just now");
      });
    });

    it("renders relative time when outside nowThreshold", () => {
      const now = Date.now();
      const pastDate = new Date(now - 1000 * 60 * 60 * 3); // 3 hours ago
      const page = render(Component, {
        props: { ...baseProps, date: pastDate, nowThreshold: 0 },
      });

      expect(componentLocator(page).textContent).toContain("3 hours ago");
    });
  });

  it("applies formatted date as title", () => {
    const page = render(Component, {
      props: { ...baseProps },
    });
    expect(componentLocator(page).getAttribute("title")).toBe(
      "1/1/24, 12:00 PM",
    );
  });
});

function componentLocator(page: RenderResult): HTMLTimeElement {
  return page.getByRole("time");
}
