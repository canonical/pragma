import { describe, expect, it, vi } from "vitest";
import createSubject from "./createSubject.js";

describe("createSubject", () => {
  it("notifies callback and observer subscribers", () => {
    const subject = createSubject<number>();
    const callback = vi.fn<(value: number) => void>();
    const observer = {
      next: vi.fn<(value: number) => void>(),
    };

    subject.subscribe(callback);
    subject.subscribe(observer);
    subject.next(42);

    expect(callback).toHaveBeenCalledWith(42);
    expect(observer.next).toHaveBeenCalledWith(42);
  });

  it("stops notifying after unsubscribe", () => {
    const subject = createSubject<string>();
    const callback = vi.fn<(value: string) => void>();

    const unsubscribe = subject.subscribe(callback);

    unsubscribe();
    subject.next("ignored");

    expect(callback).not.toHaveBeenCalled();
  });

  it("supports unsubscribing during notification without skipping remaining listeners", () => {
    const subject = createSubject<string>();
    const calls: string[] = [];

    let unsubscribeFirst = () => {};

    unsubscribeFirst = subject.subscribe((value) => {
      calls.push(`first:${value}`);
      unsubscribeFirst();
    });

    subject.subscribe((value) => {
      calls.push(`second:${value}`);
    });

    subject.next("a");
    subject.next("b");

    expect(calls).toEqual(["first:a", "second:a", "second:b"]);
  });
});
