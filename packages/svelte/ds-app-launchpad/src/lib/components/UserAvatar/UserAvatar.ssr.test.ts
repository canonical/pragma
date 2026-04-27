import { type RenderResult, render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./UserAvatar.svelte";

describe("UserAvatar SSR", () => {
  const avatarUrl = "https://assets.ubuntu.com/v1/fca94c45-snap+icon.png";

  const baseProps = {
    "data-testid": "user-avatar",
  } satisfies ComponentProps<typeof Component>;

  describe("renders as <img>", () => {
    it("when userAvatarUrl and userName are provided", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userAvatarUrl: avatarUrl,
          userName: "John Doe",
          alt: "John Doe's avatar",
        },
      });

      expectIs("img", page);

      const element = page.getByRole("img", { name: "John Doe's avatar" });
      expect(element.getAttribute("src")).toBe(avatarUrl);
      expect(element.getAttribute("alt")).toBe("John Doe's avatar");
      expect(element.getAttribute("title")).toBe("John Doe");
      expect(element.getAttribute("data-initials")).toBeTruthy();
    });

    it("when userAvatarUrl is provided without userName", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userAvatarUrl: avatarUrl,
          alt: "User avatar",
        },
      });

      expectIs("img", page);

      const element = page.getByRole("img", { name: "User avatar" });
      expect(element).toBeInstanceOf(page.window.HTMLImageElement);
      expect(element.getAttribute("src")).toBe(avatarUrl);
      expect(element.getAttribute("alt")).toBe("User avatar");
      expect(element.getAttribute("title")).toBeNull();
      expect(element.getAttribute("data-initials")).toBeNull();
    });
  });

  describe("renders as <abbr>", () => {
    it("when userName is provided without userAvatarUrl", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userName: "John Doe",
        },
      });

      expectIs("abbr", page);

      const element = page.getByTestId("user-avatar");
      expect(element.tagName).toBe("ABBR");
      expect(element.getAttribute("title")).toBe("John Doe");
      expect(element.textContent).toBe("JD");
    });

    it("when userAvatarUrl is an empty string and userName is provided", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userAvatarUrl: "",
          userName: "John Doe",
        },
      });

      expectIs("abbr", page);

      const element = page.getByTestId("user-avatar");
      expect(element.tagName).toBe("ABBR");
      expect(element.getAttribute("title")).toBe("John Doe");
      expect(element.textContent).toBe("JD");
    });
  });

  describe("renders as icon", () => {
    it("when no user data is provided", () => {
      const page = render(Component, { props: { ...baseProps } });

      expectIs("svg", page);
    });

    it("when userName is an empty string", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userName: "",
        },
      });

      expectIs("svg", page);
    });
  });

  describe("fallback behaviors", () => {
    it("includes CSS fallback hooks for no-JS image failure when userName is provided", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userAvatarUrl: avatarUrl,
          userName: "John Doe",
          alt: "John Doe's avatar",
        },
      });
      const element = page.getByRole("img", { name: "John Doe's avatar" });

      expect(element.getAttribute("data-initials")).toBeTruthy();
      expect(element.getAttribute("title")).toBe("John Doe");
    });

    it("does not have icon fallback hooks for no-JS image failure without userName", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userAvatarUrl: avatarUrl,
          alt: "User avatar",
        },
      });
      const element = page.getByRole("img", { name: "User avatar" });

      expect(element.getAttribute("data-initials")).toBeNull();
      expect(page.getByTestId("user-avatar").querySelector("abbr")).toBeNull();
    });
  });
});

const elements = ["img", "abbr", "svg"] as const;

function expectIs(element: (typeof elements)[number], page: RenderResult) {
  for (const el of elements) {
    if (el === element) {
      expect(page.container.querySelector(el)).toBeTruthy();
    } else {
      expect(page.container.querySelector(el)).toBeNull();
    }
  }
}
