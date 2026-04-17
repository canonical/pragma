import { userEvent } from "vitest/browser";

// macOS WebKit (Safari) requires Option+Tab to focus links;
// plain Tab only cycles form controls.
const isWebkitMacOS =
  /Macintosh/.test(navigator.userAgent) &&
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Chrome|Chromium|Firefox/.test(navigator.userAgent);

/**
 * Presses Tab (or Option+Tab on macOS WebKit) to move focus to the next
 * focusable element, including links.
 */
export async function tabToNextFocusable(): Promise<void> {
  if (isWebkitMacOS) {
    await userEvent.keyboard("{Alt>}{Tab}{/Alt}");
  } else {
    await userEvent.tab();
  }
}
