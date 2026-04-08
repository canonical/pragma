import { render } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./UserAvatar.svelte";

describe("UserAvatar SSR", () => {
  const avatarUrl = "https://assets.ubuntu.com/v1/fca94c45-snap+icon.png";

  const baseProps = {
    "data-testid": "user-avatar",
  } satisfies ComponentProps<typeof Component>;

  describe("basics", () => {
    it("doesn't throw", () => {
      expect(() => {
        render(Component, { props: { ...baseProps } });
      }).not.toThrow();
    });

    it("renders", () => {
      const page = render(Component, { props: { ...baseProps } });
      expect(page.getByTestId("user-avatar")).toBeInstanceOf(
        page.window.HTMLDivElement,
      );
    });
  });

  describe("renders as <img>", () => {
    it("when userAvatarUrl and userName are provided", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userAvatarUrl: avatarUrl,
          userName: "John Doe",
        },
      });
      const element = page.getByRole("img", { name: "John Doe's avatar" });
      expect(element).toBeInstanceOf(page.window.HTMLImageElement);
      expect(element.getAttribute("src")).toBe(avatarUrl);
      expect(element.getAttribute("alt")).toBe("John Doe's avatar");
      expect(element.getAttribute("title")).toBe("John Doe");
      expect(element.getAttribute("data-initials")).toBeTruthy();
      expect(page.getByTestId("user-avatar").querySelector("abbr")).toBeNull();
      expect(page.queryByLabelText("User avatar icon")).toBeNull();
    });

    it("when userAvatarUrl is provided without userName", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userAvatarUrl: avatarUrl,
        },
      });
      const element = page.getByRole("img", { name: "User avatar" });
      expect(element).toBeInstanceOf(page.window.HTMLImageElement);
      expect(element.getAttribute("src")).toBe(avatarUrl);
      expect(element.getAttribute("alt")).toBe("User avatar");
      expect(element.getAttribute("title")).toBeNull();
      expect(element.getAttribute("data-initials")).toBeNull();
      expect(page.getByTestId("user-avatar").querySelector("abbr")).toBeNull();
      expect(page.queryByLabelText("User avatar icon")).toBeNull();
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
      const element = page.getByTestId("user-avatar");

      expect(element).toBeInstanceOf(page.window.HTMLDivElement);
      expect(element.classList).toContain("no-image");
      expect(element.querySelector("abbr")?.getAttribute("title")).toBe(
        "John Doe",
      );
      expect(element.querySelector("img")).toBeNull();
      expect(page.queryByLabelText("User avatar icon")).toBeNull();
    });

    it("when userAvatarUrl is an empty string and userName is provided", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userAvatarUrl: "",
          userName: "John Doe",
        },
      });
      const element = page.getByTestId("user-avatar");

      expect(element).toBeInstanceOf(page.window.HTMLDivElement);
      expect(element.classList).toContain("no-image");
      expect(element.querySelector("abbr")?.getAttribute("title")).toBe(
        "John Doe",
      );
      expect(element.querySelector("img")).toBeNull();
      expect(page.queryByLabelText("User avatar icon")).toBeNull();
    });
  });

  describe("renders as icon", () => {
    it("when no user data is provided", () => {
      const page = render(Component, { props: { ...baseProps } });
      const element = page.getByTestId("user-avatar");

      expect(element).toBeInstanceOf(page.window.HTMLDivElement);
      expect(element.classList).toContain("ds");
      expect(element.classList).toContain("user-avatar");
      expect(element.classList).toContain("no-image");
      expect(page.getByLabelText("User avatar icon")).toBeInstanceOf(
        page.window.SVGElement,
      );
      expect(element.querySelector("img")).toBeNull();
      expect(element.querySelector("abbr")).toBeNull();
    });

    it("when userName is an empty string", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userName: "",
        },
      });
      const element = page.getByTestId("user-avatar");

      expect(element).toBeInstanceOf(page.window.HTMLDivElement);
      expect(element.classList).toContain("no-image");
      expect(page.getByLabelText("User avatar icon")).toBeInstanceOf(
        page.window.SVGElement,
      );
      expect(element.querySelector("img")).toBeNull();
      expect(element.querySelector("abbr")).toBeNull();
    });
  });

  describe("fallback behaviors", () => {
    it("includes CSS fallback hooks for no-JS image failure when userName is provided", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userAvatarUrl: avatarUrl,
          userName: "John Doe",
        },
      });
      const element = page.getByRole("img", { name: "John Doe's avatar" });

      expect(element).toBeInstanceOf(page.window.HTMLImageElement);
      expect(element.getAttribute("data-initials")).toBeTruthy();
      expect(element.getAttribute("title")).toBe("John Doe");
      expect(page.getByTestId("user-avatar").querySelector("abbr")).toBeNull();
      expect(page.queryByLabelText("User avatar icon")).toBeNull();
    });

    it("does not have icon fallback hooks for no-JS image failure without userName", () => {
      const page = render(Component, {
        props: {
          ...baseProps,
          userAvatarUrl: avatarUrl,
        },
      });
      const element = page.getByRole("img", { name: "User avatar" });

      expect(element).toBeInstanceOf(page.window.HTMLImageElement);
      expect(element.getAttribute("data-initials")).toBeNull();
      expect(page.getByTestId("user-avatar").querySelector("abbr")).toBeNull();
      expect(page.queryByLabelText("User avatar icon")).toBeNull();
    });
  });
});
