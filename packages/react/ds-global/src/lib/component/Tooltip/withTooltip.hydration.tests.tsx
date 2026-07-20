import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { withTooltip } from "./index.js";

/**
 * Unlike withTooltip.tests.tsx, this file deliberately does NOT mock
 * `createPortal` — it exercises the real server/client contract: server HTML
 * must hydrate without a recoverable-error (React 19 reports hydration
 * mismatches through `onRecoverableError`, not `console.error`), and the
 * message must portal into the document body only after mount.
 */
describe("withTooltip (hydration)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hydrates server HTML with no recoverable error and portals the message after mount", () => {
    const Trigger = () => <button type="button">Trigger</button>;
    const Tooltipped = withTooltip(Trigger, "Helpful message");
    const ui = <Tooltipped />;

    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.appendChild(container);

    // The message is not in the server HTML — it is deferred until after mount.
    expect(container.textContent).not.toContain("Helpful message");

    // A hydration mismatch surfaces here in React 19; assert it never fires.
    const onRecoverableError = vi.fn();
    act(() => {
      hydrateRoot(container, ui, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();

    // After mount the message is portalled to the document body, outside the
    // inline tooltip-area wrapper.
    const message = document.body.querySelector(".ds.tooltip .text");
    expect(message?.textContent).toBe("Helpful message");
    expect(message?.closest(".ds.tooltip-area")).toBeNull();
  });
});
