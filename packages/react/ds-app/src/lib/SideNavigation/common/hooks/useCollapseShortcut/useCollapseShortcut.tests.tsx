import { fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCollapseShortcut } from "./useCollapseShortcut.js";

describe("useCollapseShortcut", () => {
  it("does not attach a listener by default (reserved, disabled)", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ onTrigger }));
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("does not attach a listener when explicitly disabled", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: false, onTrigger }));
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("calls onTrigger on Ctrl+B when enabled", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: true, onTrigger }));
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it("matches the key case-insensitively", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: true, onTrigger }));
    fireEvent.keyDown(window, { key: "B", ctrlKey: true });
    expect(onTrigger).toHaveBeenCalledOnce();
  });

  it("ignores the key without the Ctrl modifier, even when enabled", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: true, onTrigger }));
    fireEvent.keyDown(window, { key: "b", ctrlKey: false });
    expect(onTrigger).not.toHaveBeenCalled();
  });
  it("ignores an unrelated key, even with Ctrl held", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: true, onTrigger }));
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("ignores the chord when another modifier joins it (Ctrl+Shift+B)", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: true, onTrigger }));
    fireEvent.keyDown(window, {
      key: "b",
      ctrlKey: true,
      shiftKey: true,
    });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it("ignores the chord when its target is an editable element (Ctrl+B is bold there)", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: true, onTrigger }));
    const input = document.createElement("input");
    document.body.append(input);
    fireEvent.keyDown(input, { key: "b", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
    input.remove();
  });

  it("ignores the chord when its target is contenteditable", () => {
    const onTrigger = vi.fn();
    renderHook(() => useCollapseShortcut({ enabled: true, onTrigger }));
    // setAttribute, not the `.contentEditable` property: jsdom does not
    // implement the property setter (it silently sets nothing).
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    document.body.append(editor);
    fireEvent.keyDown(editor, { key: "b", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
    editor.remove();
  });

  it("detaches the listener when enabled flips back to false", () => {
    const onTrigger = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useCollapseShortcut({ enabled, onTrigger }),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });
    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(onTrigger).not.toHaveBeenCalled();
  });
});
