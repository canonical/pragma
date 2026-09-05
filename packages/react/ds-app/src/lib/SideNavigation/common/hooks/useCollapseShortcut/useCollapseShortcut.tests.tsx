import { fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCollapseShortcut } from "./useCollapseShortcut.js";

describe("useCollapseShortcut", () => {
  it("does not attach a listener when disabled (the default)", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ onTrigger }));
    fireEvent.keyDown(window, { key: "e", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("calls onTrigger on Ctrl+E when enabled", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: true, onTrigger }));
    fireEvent.keyDown(window, { key: "e", ctrlKey: true });
    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it("ignores the key without the Ctrl modifier, even when enabled", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: true, onTrigger }));
    fireEvent.keyDown(window, { key: "e", ctrlKey: false });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("ignores an unrelated key, even with Ctrl held", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: true, onTrigger }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("detaches the listener when enabled flips back to false", () => {
    const onTrigger = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useCollapseShortcut({ enabled, onTrigger }),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });
    fireEvent.keyDown(window, { key: "e", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });
});
