import { act } from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContextualMenu from "./ContextualMenu.js";
import type { MenuEntry } from "./types.js";

const items: MenuEntry[] = [
  { key: "cut", label: "Cut", url: "#cut" },
  { type: "separator", key: "before-zoom" },
  { key: "zoom", label: "Zoom", url: "#zoom" },
];

/**
 * The menu is portalled to the document body only after mount. Before that gate
 * it rendered the portal on the first client render (via a `typeof window`
 * check that is already truthy there), which mismatched the inline server
 * output and forced a hydration recovery. This guards against that regression:
 * a mismatch surfaces through React 19's `onRecoverableError`.
 */
describe("ContextualMenu (hydration)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("hydrates server HTML with no recoverable error", () => {
    const ui = <ContextualMenu items={items}>Actions</ContextualMenu>;

    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.appendChild(container);

    const onRecoverableError = vi.fn();
    let root: Root | undefined;
    act(() => {
      root = hydrateRoot(container, ui, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    // The trigger is still present after hydration — the tree was reused, not
    // replaced by a mismatch recovery.
    expect(container.querySelector(".trigger")?.textContent).toBe("Actions");

    // Unmounting runs the effect cleanups, which cancel pending debounced work;
    // a timer left behind would fire after the test environment is torn down.
    act(() => {
      root?.unmount();
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("hydrates a Button trigger from triggerProps with no recoverable error", () => {
    const ui = (
      <ContextualMenu
        triggerProps={{ importance: "secondary", className: "ssr-trigger" }}
        items={items}
      >
        Filters
      </ContextualMenu>
    );

    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.appendChild(container);

    const onRecoverableError = vi.fn();
    act(() => {
      hydrateRoot(container, ui, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector(".ssr-trigger")?.textContent).toBe(
      "Filters",
    );
  });
});
