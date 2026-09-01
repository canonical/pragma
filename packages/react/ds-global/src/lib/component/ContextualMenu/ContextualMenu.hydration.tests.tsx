import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ContextualMenu from "./ContextualMenu.js";
import type { MenuEntry } from "./types.js";

const items: MenuEntry[] = [
  { key: "cut", label: "Cut", url: "#cut" },
  { type: "separator" },
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hydrates server HTML with no recoverable error", () => {
    const ui = <ContextualMenu trigger="Actions" items={items} />;

    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.appendChild(container);

    const onRecoverableError = vi.fn();
    act(() => {
      hydrateRoot(container, ui, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    // The trigger is still present after hydration — the tree was reused, not
    // replaced by a mismatch recovery.
    expect(container.querySelector(".trigger")?.textContent).toBe("Actions");
  });
});
