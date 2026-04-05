import { describe, expect, it, vi } from "vitest";
import createMemoryAdapter from "./createMemoryAdapter.js";

describe("createMemoryAdapter", () => {
  it("tracks push and replace navigations in memory", () => {
    const adapter = createMemoryAdapter(new URL("https://example.com/start"));
    const listener = vi.fn<(location: string | URL) => void>();
    const unsubscribe = adapter.subscribe(listener);

    adapter.navigate("https://example.com/first");
    adapter.navigate(new URL("https://example.com/second?tab=details"), {
      replace: true,
    });
    unsubscribe();
    adapter.navigate("/ignored");

    expect(adapter.getLocation()).toMatchObject({
      pathname: "/ignored",
      search: "",
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("supports back and forward navigation without leaving the in-memory stack", () => {
    const adapter = createMemoryAdapter("/start");
    const listener = vi.fn<(location: string | URL) => void>();

    adapter.subscribe(listener);
    adapter.navigate("/first");
    adapter.navigate("/second");
    adapter.back();
    adapter.back();
    adapter.back();
    adapter.forward();
    adapter.forward();
    adapter.forward();

    expect(adapter.getLocation()).toMatchObject({
      pathname: "/second",
    });
    expect(listener).toHaveBeenCalledTimes(6);
  });
});
