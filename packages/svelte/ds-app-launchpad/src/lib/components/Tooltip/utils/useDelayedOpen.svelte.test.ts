import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChainingManager } from "./ChainingManager.js";
import { useDelayedOpen } from "./useDelayedOpen.svelte.js";

const setChainingSpy = vi.fn();

class MockChainingManager extends ChainingManager {
  public mockChaining = false;

  override set chaining(value: boolean) {
    setChainingSpy(value);
  }

  override get chaining() {
    return this.mockChaining;
  }
}

describe("useDelayedOpen", () => {
  let chainingManager: MockChainingManager;

  beforeEach(() => {
    chainingManager = new MockChainingManager(350);
    setChainingSpy.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns getOpen initially", () => {
    const destroy = $effect.root(() => {
      const getDelayedOpen = useDelayedOpen(
        () => false,
        () => 500,
        chainingManager,
      );
      const delayedOpen = getDelayedOpen();
      expect(delayedOpen).toBe(false);
    });
    destroy();
  });

  it("returns true after delay when getOpen becomes true", () => {
    let open = $state(false);
    const destroy = $effect.root(() => {
      const getDelayedOpen = useDelayedOpen(
        () => open,
        () => 500,
        chainingManager,
      );
      expect(getDelayedOpen()).toBe(false);

      open = true;
      flushSync();
      expect(getDelayedOpen()).toBe(false);
      vi.advanceTimersByTime(500);
      expect(getDelayedOpen()).toBe(true);
    });
    destroy();
  });

  it("returns false immediately when getOpen becomes false", () => {
    let open = $state(true);
    const destroy = $effect.root(() => {
      const getDelayedOpen = useDelayedOpen(
        () => open,
        () => 500,
        chainingManager,
      );
      expect(getDelayedOpen()).toBe(true);
      open = false;
      flushSync();
      expect(getDelayedOpen()).toBe(false);
    });
    destroy();
  });

  it("opens immediately if chaining is true", () => {
    let open = $state(false);
    chainingManager.mockChaining = true;
    const destroy = $effect.root(() => {
      const getDelayedOpen = useDelayedOpen(
        () => open,
        () => 500,
        chainingManager,
      );
      expect(getDelayedOpen()).toBe(false);
      open = true;
      flushSync();
      expect(getDelayedOpen()).toBe(true);
    });
    destroy();
  });

  it("sets chaining to true when closing", () => {
    let open = $state(true);
    const destroy = $effect.root(() => {
      const getDelayedOpen = useDelayedOpen(
        () => open,
        () => 500,
        chainingManager,
      );
      flushSync();
      expect(getDelayedOpen()).toBe(true);
      expect(setChainingSpy).not.toHaveBeenCalled();
      open = false;
      flushSync();
      expect(getDelayedOpen()).toBe(false);
      expect(setChainingSpy).toHaveBeenCalledWith(true);
    });
    destroy();
  });

  it("does not set chaining on initial run", () => {
    const destroy = $effect.root(() => {
      const getDelayedOpen = useDelayedOpen(
        () => false,
        () => 500,
        chainingManager,
      );
      flushSync();
      expect(getDelayedOpen()).toBe(false);
      expect(setChainingSpy).not.toHaveBeenCalled();
    });
    destroy();
  });
});
