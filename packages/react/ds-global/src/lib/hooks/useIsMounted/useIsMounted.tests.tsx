import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIsMounted } from "../index.js";

describe("useIsMounted", () => {
  it("returns true once mounted", () => {
    const { result } = renderHook(() => useIsMounted());
    expect(result.current).toBe(true);
  });
});
