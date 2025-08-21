import { describe, expect, it } from "vitest";
import * as fixtures from "./fixtures/index.js";
import { render } from "./render.js";

describe("render", () => {
  describe("core", () => {
    it("returns queries and container and html", () => {
      const { window, container, getByText, pretty } = render(
        fixtures.Greeting,
        { props: { name: "World" } }
      );
      expect(container).toBeInstanceOf(window.HTMLElement);
      expect(() => getByText("Hello World")).not.toThrow();
      const prettyOutput = pretty();
      expect(typeof prettyOutput).toBe("string");
      expect(prettyOutput.length).toBeGreaterThan(0);
    });

    it("honors pretty maxLength parameter", () => {
      const { pretty } = render(fixtures.Content);
      const short = pretty(10);
      expect(short.length).toBeLessThanOrEqual(10 + 100);
    });
  });

  describe("selectors", () => {
    it("byTestId finds element by test id", () => {
      const { window, getByTestId } = render(fixtures.Greet);
      const el = getByTestId("greet");
      expect(el).toBeInstanceOf(window.HTMLElement);
      expect(el.textContent).toBe("Hello");
    });

    it("byRole finds by role and name", () => {
      const { window, getAllByRole, getByRole } = render(fixtures.Buttons);
      const buttons = getAllByRole("button");
      expect(Array.isArray(buttons)).toBe(true);
      expect(buttons.length).toBe(2);
      const save = getByRole("button", { name: "Save" });
      expect(save).toBeInstanceOf(window.HTMLElement);
    });

    it("byLabelText finds control by label text", () => {
      const { window, getByLabelText } = render(fixtures.LabeledInput);
      const input = getByLabelText("Email");
      expect(input).toBeInstanceOf(window.HTMLElement);
      expect((input as HTMLInputElement).type).toBe("email");
    });

    it("byPlaceholder/byTitle find inputs by placeholder and title", () => {
      const { window, getByPlaceholderText, getByTitle, queryByText } = render(
        fixtures.InputsAndTitle
      );
      const search = getByPlaceholderText("Search");
      expect(search).toBeInstanceOf(window.HTMLElement);
      const abbr = getByTitle("Internationalization");
      expect(abbr).toBeInstanceOf(window.HTMLElement);
      const missing = queryByText("Definitely not here");
      expect(missing).toBeNull();
    });
  });
});
