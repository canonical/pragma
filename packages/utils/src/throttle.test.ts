import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import throttle from "./throttle.js";

describe("throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the function after the wait period", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledOnce();
  });

  it("only executes the last call when called rapidly", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledOnce();
  });

  it("passes the latest arguments", () => {
    const fn = vi.fn((x: number) => x);
    const throttled = throttle(fn, 100);

    throttled(1);
    throttled(2);
    throttled(3);

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith(3);
  });

  it("resets the timer on each call", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    throttled();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("allows subsequent calls after the wait period expires", () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();

    throttled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
