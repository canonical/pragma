import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Popover from "./Popover.js";

describe("Popover hydration", () => {
  it("hydrates native details without a recoverable error", () => {
    const ui = (
      <Popover trigger="Filter" label="Filter status">
        <input aria-label="Search" />
      </Popover>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    act(() => {
      root = hydrateRoot(container, ui, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector("summary")?.textContent).toBe("Filter");
    act(() => root.unmount());
    container.remove();
  });

  it("hydrates a styled Button before portalling its dialog", () => {
    const ui = (
      <Popover
        trigger="Filter"
        triggerProps={{ importance: "secondary" }}
        label="Filter status"
      >
        <input aria-label="Search" />
      </Popover>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(ui);
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    act(() => {
      root = hydrateRoot(container, ui, { onRecoverableError });
    });
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector(".ds.button")?.textContent).toBe("Filter");
    act(() => root.unmount());
    container.remove();
  });
});
