import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDateTimeFormats } from "./useDateTimeFormats.js";

describe("useDateTimeFormats", () => {
  it("defaults to absolute and toggles to relative", () => {
    const { result } = renderHook(() => useDateTimeFormats(undefined));
    expect(result.current.mode).toBe("absolute");
    const formatted = result.current.format("2024-06-01T10:00:00Z");
    expect(formatted.display).not.toBe("");
    act(() => result.current.toggle());
    expect(result.current.mode).toBe("relative");
    const relative = result.current.format("2024-06-01T10:00:00Z");
    expect(relative.display).toContain("ago");
    expect(relative.alternate).toBe(formatted.display);
  });

  it("keeps the mode when not toggleable", () => {
    const { result } = renderHook(() =>
      useDateTimeFormats({ toggleable: false }),
    );
    act(() => result.current.toggle());
    expect(result.current.mode).toBe("absolute");
  });

  it("uses custom formatters", () => {
    const { result } = renderHook(() =>
      useDateTimeFormats({
        formatAbsolute: (iso) => `ABS:${iso}`,
        formatRelative: () => "REL",
      }),
    );
    const formatted = result.current.format("2024-06-01T10:00:00Z");
    expect(formatted.display).toBe("ABS:2024-06-01T10:00:00Z");
    expect(formatted.alternate).toBe("REL");
  });

  it("falls back to absolute when the relative format is empty", () => {
    const { result } = renderHook(() =>
      useDateTimeFormats({ formatRelative: () => "" }),
    );
    act(() => result.current.toggle());
    const formatted = result.current.format("2024-06-01T10:00:00Z");
    expect(formatted.display).not.toBe("");
  });

  it("returns an empty display for an invalid timestamp", () => {
    const { result } = renderHook(() => useDateTimeFormats(undefined));
    expect(result.current.format("not-a-date").display).toBe("");
  });
});
