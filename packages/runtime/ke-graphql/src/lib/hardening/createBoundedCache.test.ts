import { describe, expect, it } from "vitest";
import createBoundedCache from "./createBoundedCache.js";

describe("createBoundedCache (bounded LRU)", () => {
  it("evicts the least-recently-used entry past the size limit", () => {
    const cache = createBoundedCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3); // over capacity → evict "a"
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);
    expect(cache.has("c")).toBe(true);
    expect(cache.size).toBe(2);
  });

  it("get() refreshes recency, protecting an entry from eviction", () => {
    const cache = createBoundedCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1); // "a" is now most-recent; "b" is LRU
    cache.set("c", 3); // evicts "b", not "a"
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
  });

  it("behaves as a normal Map within the limit", () => {
    const cache = createBoundedCache<string, number>(10);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("missing")).toBeUndefined();
    cache.delete("a");
    expect(cache.has("a")).toBe(false);
  });
});
