import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Spinner.svelte";

describe("Spinner SSR", () => {
  const baseProps = {} satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders with loading label", () => {
      const page = render(Component, { props: { ...baseProps } });
      const spinner = page.getByLabelText("Loading");
      expect(spinner).toBeTruthy();
    });
  });

  describe("attributes", () => {
    it("applies classes", () => {
      const page = render(Component, {
        props: { class: "test-class", ...baseProps },
      });
      const spinner = page.getByLabelText("Loading");
      expect(spinner.classList).toContain("test-class");
      expect(spinner.classList).toContain("ds");
      expect(spinner.classList).toContain("spinner");
    });
  });
});
