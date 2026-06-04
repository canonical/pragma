import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { InitialDataProvider, useInitialData } from "./InitialDataContext.js";

declare global {
  interface Window {
    __INITIAL_DATA__?: Record<string, unknown>;
  }
}

afterEach(() => {
  window.__INITIAL_DATA__ = undefined;
});

describe("useInitialData (client)", () => {
  it("returns the provider value when wrapped", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <InitialDataProvider value={{ theme: "dark" }}>
        {children}
      </InitialDataProvider>
    );
    const { result } = renderHook(() => useInitialData(), { wrapper });
    expect(result.current).toEqual({ theme: "dark" });
  });

  it("prefers the provider over window.__INITIAL_DATA__", () => {
    window.__INITIAL_DATA__ = { theme: "light" };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <InitialDataProvider value={{ theme: "dark" }}>
        {children}
      </InitialDataProvider>
    );
    const { result } = renderHook(() => useInitialData(), { wrapper });
    expect(result.current).toEqual({ theme: "dark" });
  });

  it("falls back to window.__INITIAL_DATA__ when no provider", () => {
    window.__INITIAL_DATA__ = { theme: "dark" };
    const { result } = renderHook(() => useInitialData());
    expect(result.current).toEqual({ theme: "dark" });
  });

  it("returns an empty object when neither provider nor global is present", () => {
    const { result } = renderHook(() => useInitialData());
    expect(result.current).toEqual({});
  });
});
