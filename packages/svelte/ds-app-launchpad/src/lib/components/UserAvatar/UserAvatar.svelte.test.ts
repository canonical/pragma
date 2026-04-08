/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Component from "./UserAvatar.svelte";

describe("UserAvatar component", () => {
  const avatarUrl = "https://assets.ubuntu.com/v1/fca94c45-snap+icon.png";

  const baseProps = {
    "data-testid": "user-avatar",
  } satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("renders", async () => {
      const page = render(Component, { ...baseProps });
      await expect.element(page.getByTestId("user-avatar")).toBeInTheDocument();
    });
  });

  describe("attributes", () => {
    it.each([
      ["id", "test-id"],
      ["aria-label", "test-aria-label"],
    ])("applies %s", async (attribute, expected) => {
      const page = render(Component, { ...baseProps, [attribute]: expected });
      await expect
        .element(page.getByTestId("user-avatar"))
        .toHaveAttribute(attribute, expected);
    });

    it("applies classes", async () => {
      const page = render(Component, { ...baseProps, class: "test-class" });
      const element = page.getByTestId("user-avatar");
      await expect.element(element).toHaveClass("test-class");
      await expect.element(element).toHaveClass("ds");
      await expect.element(element).toHaveClass("user-avatar");
    });

    it("applies style", async () => {
      const page = render(Component, {
        ...baseProps,
        style: "color: orange;",
      });
      await expect
        .element(page.getByTestId("user-avatar"))
        .toHaveStyle({ color: "orange" });
    });
  });

  describe("renders as <img>", () => {
    it("when userAvatarUrl and userName are provided", async () => {
      const page = render(Component, {
        ...baseProps,
        userAvatarUrl: avatarUrl,
        userName: "John Doe",
      });

      const element = page.getByRole("img", { name: "John Doe's avatar" });
      await expect.element(element).toBeInTheDocument();
      await expect.element(element).toHaveAttribute("src", avatarUrl);
      await expect.element(element).toHaveAttribute("alt", "John Doe's avatar");
      await expect.element(element).toHaveAttribute("title", "John Doe");
      await expect.element(element).toHaveAttribute("data-initials");
      await expect
        .element(page.getByLabelText("User avatar icon"))
        .not.toBeInTheDocument();
      expect(page.container.querySelector("abbr")).toBeNull();
    });

    it("when userAvatarUrl is provided without userName", async () => {
      const page = render(Component, {
        ...baseProps,
        userAvatarUrl: avatarUrl,
      });

      const element = page.getByRole("img", { name: "User avatar" });
      await expect.element(element).toBeInTheDocument();
      await expect.element(element).toHaveAttribute("src", avatarUrl);
      await expect.element(element).toHaveAttribute("alt", "User avatar");
      await expect.element(element).not.toHaveAttribute("title");
      await expect.element(element).not.toHaveAttribute("data-initials");
      await expect
        .element(page.getByLabelText("User avatar icon"))
        .not.toBeInTheDocument();
      expect(page.container.querySelector("abbr")).toBeNull();
    });
  });

  describe("renders as <abbr>", () => {
    it("when userName is provided without userAvatarUrl", async () => {
      const page = render(Component, { ...baseProps, userName: "John Doe" });

      await expect.element(page.getByTitle("John Doe")).toBeInTheDocument();
      await expect
        .element(page.getByLabelText("User avatar icon"))
        .not.toBeInTheDocument();
      await expect.element(page.getByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("renders as icon", () => {
    it("when no user data is provided", async () => {
      const page = render(Component, { ...baseProps });

      await expect
        .element(page.getByLabelText("User avatar icon"))
        .toBeInTheDocument();
      expect(page.getByTestId("user-avatar").element().tagName).toBe("DIV");
      expect(page.container.querySelector("img")).toBeNull();
      expect(page.container.querySelector("abbr")).toBeNull();
    });
  });

  describe("fallback behaviors", () => {
    it("falls back to <abbr> when JS handles image error and userName is provided", async () => {
      const page = render(Component, {
        ...baseProps,
        userAvatarUrl: "invalid-url",
        userName: "John Doe",
      });

      const imageElement = page.getByRole("img", { name: "John Doe's avatar" });
      imageElement.element().dispatchEvent(new Event("error"));

      await expect.element(page.getByTitle("John Doe")).toBeInTheDocument();
      await expect
        .element(page.getByRole("img", { name: "John Doe's avatar" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByLabelText("User avatar icon"))
        .not.toBeInTheDocument();
    });

    it("falls back to icon when JS handles image error and userName is missing", async () => {
      const page = render(Component, {
        ...baseProps,
        userAvatarUrl: "invalid-url",
      });

      const imageElement = page.getByRole("img", { name: "User avatar" });
      imageElement.element().dispatchEvent(new Event("error"));

      await expect
        .element(page.getByLabelText("User avatar icon"))
        .toBeInTheDocument();
      await expect
        .element(page.getByRole("img", { name: "User avatar", exact: true }))
        .not.toBeInTheDocument();
      expect(page.container.querySelector("abbr")).toBeNull();
    });

    describe("when no JS is available", () => {
      it("keeps rendering as <img> in no-JS when userName is provided", async () => {
        const page = render(Component, {
          ...baseProps,
          userAvatarUrl: `invalid-url`,
          userName: "John Doe",
          onerror: () => {},
        });

        const imageElement = page.getByRole("img", {
          name: "John Doe's avatar",
        });
        imageElement.element().dispatchEvent(new Event("error"));

        await expect.element(imageElement).toBeInTheDocument();
        await expect.element(imageElement).toHaveAttribute("data-initials");
        await expect
          .element(page.getByLabelText("User avatar icon"))
          .not.toBeInTheDocument();
      });

      it("keeps rendering as <img> in no-JS without userName", async () => {
        const page = render(Component, {
          ...baseProps,
          userAvatarUrl: "invalid-url",
          onerror: () => {},
        });

        const imageElement = page.getByRole("img", {
          name: "User avatar",
          exact: true,
        });
        imageElement.element().dispatchEvent(new Event("error"));

        await expect.element(imageElement).toBeInTheDocument();
        await expect.element(imageElement).not.toHaveAttribute("data-initials");
        await expect
          .element(page.getByLabelText("User avatar icon"))
          .not.toBeInTheDocument();
      });
    });
  });

  describe("modifiers", () => {
    const sizeModifiers = ["small", "large"] as const;

    it.each(sizeModifiers)("applies %s modifier", async (size) => {
      const page = render(Component, {
        ...baseProps,
        size,
      });
      const element = page.getByTestId("user-avatar");
      const classList = element.element().classList;

      expect(classList.contains(size)).toBe(true);
      sizeModifiers.forEach((s) => {
        if (s !== size) {
          expect(classList.contains(s)).toBe(false);
        }
      });
    });
  });
});
