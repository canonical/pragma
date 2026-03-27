import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import debounce from "./debounce.js";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays execution until after the wait period", async () => {
    const fn = vi.fn(() => 42);
    const debounced = debounce(fn, 100);

    const promise = debounced();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    await expect(promise).resolves.toBe(42);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("only calls the function once for rapid invocations", async () => {
    const fn = vi.fn((x: number) => x * 2);
    const debounced = debounce(fn, 100);

    debounced(1);
    debounced(2);
    const promise = debounced(3);

    vi.advanceTimersByTime(100);

    await expect(promise).resolves.toBe(6);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(3);
  });

  it("resets the timer on each call", async () => {
    const fn = vi.fn(() => "done");
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    const promise = debounced();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    await expect(promise).resolves.toBe("done");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("cancel prevents the function from being called", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced.cancel();

    vi.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();
  });

  it("propagates errors from the debounced function", async () => {
    const fn = vi.fn(() => {
      throw new Error("boom");
    });
    const debounced = debounce(fn, 100);

    const promise = debounced();
    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow("boom");
  });

  it("works with async functions", async () => {
    const fn = vi.fn(async (x: string) => `hello ${x}`);
    const debounced = debounce(fn, 50);

    const promise = debounced("world");
    vi.advanceTimersByTime(50);

    await expect(promise).resolves.toBe("hello world");
  });
});
