import { THEME } from "@canonical/storybook-addon-shell-theme";
import type { DocsContainerProps } from "@storybook/addon-docs/blocks";
import { act, render, screen } from "@testing-library/react";
import type { ThemeVars } from "storybook/theming";
import { afterEach, describe, expect, it, vi } from "vitest";

// Stand in for Storybook's own container so the theme it receives is
// observable. The real one needs a populated DocsContext.
vi.mock("@storybook/addon-docs/blocks", () => ({
  DocsContainer: ({
    theme,
    children,
  }: {
    theme?: ThemeVars;
    children?: React.ReactNode;
  }) => (
    <div data-testid="base" data-base={theme?.base} data-appbg={theme?.appBg}>
      {children}
    </div>
  ),
}));

const { DocsContainer } = await import("./DocsContainer.js");

/**
 * jsdom does not implement matchMedia. This stub records listeners so a test
 * can fire a `change` the way an OS theme switch would.
 */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
      listeners.add(fn);
    },
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
      listeners.delete(fn);
    },
  }));

  return {
    emit(next: boolean) {
      matches = next;
      for (const fn of listeners) {
        fn({ matches: next } as MediaQueryListEvent);
      }
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

// Only forwarded by the container, never read, so a placeholder suffices.
const context = {} as DocsContainerProps["context"];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DocsContainer", () => {
  it("uses the light theme when the OS prefers light", () => {
    stubMatchMedia(false);

    render(<DocsContainer context={context} />);

    expect(screen.getByTestId("base")).toHaveAttribute("data-base", "light");
  });

  it("uses the dark theme when the OS prefers dark", () => {
    stubMatchMedia(true);

    render(<DocsContainer context={context} />);

    expect(screen.getByTestId("base")).toHaveAttribute("data-base", "dark");
  });

  it("follows a live OS change without a reload", () => {
    const media = stubMatchMedia(false);

    render(<DocsContainer context={context} />);
    expect(screen.getByTestId("base")).toHaveAttribute("data-base", "light");

    // `act` so React flushes the store update the subscription schedules.
    act(() => media.emit(true));

    expect(screen.getByTestId("base")).toHaveAttribute("data-base", "dark");
  });

  it("lets an explicitly supplied theme win over the OS preference", () => {
    stubMatchMedia(true);

    render(<DocsContainer context={context} theme={THEME.light} />);

    expect(screen.getByTestId("base")).toHaveAttribute("data-base", "light");
  });

  it("removes its media listener on unmount", () => {
    const media = stubMatchMedia(false);

    const { unmount } = render(<DocsContainer context={context} />);
    expect(media.listenerCount).toBe(1);

    unmount();

    expect(media.listenerCount).toBe(0);
  });
});
