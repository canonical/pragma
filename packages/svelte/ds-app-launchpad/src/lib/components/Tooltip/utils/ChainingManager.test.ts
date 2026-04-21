import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChainingManager } from "./ChainingManager.js";

describe("ChainingManager", () => {
  let chainingManager: ChainingManager;
  const CHAINING_THRESHOLD = 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    chainingManager = new ChainingManager(CHAINING_THRESHOLD);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with chaining set to false", () => {
    expect(chainingManager.chaining).toBe(false);
  });

  describe("chaining setter", () => {
    it("should set chaining to true", () => {
      chainingManager.chaining = true;
      expect(chainingManager.chaining).toBe(true);
    });

    it("should set chaining to false", () => {
      chainingManager.chaining = true;
      chainingManager.chaining = false;
      expect(chainingManager.chaining).toBe(false);
    });

    it("should automatically reset chaining to false after threshold time", () => {
      chainingManager.chaining = true;
      expect(chainingManager.chaining).toBe(true);

      // Fast forward time by the threshold amount
      vi.advanceTimersByTime(CHAINING_THRESHOLD);

      expect(chainingManager.chaining).toBe(false);
    });

    it("should restart timeout when setting chaining to true multiple times", () => {
      chainingManager.chaining = true;

      // Advance time partially
      vi.advanceTimersByTime(CHAINING_THRESHOLD / 2);
      expect(chainingManager.chaining).toBe(true);

      // Set chaining again (should restart timeout)
      chainingManager.chaining = true;

      // Advance by another half threshold (should still be true)
      vi.advanceTimersByTime(CHAINING_THRESHOLD / 2);
      expect(chainingManager.chaining).toBe(true);

      // Advance by remaining time (should now be false)
      vi.advanceTimersByTime(CHAINING_THRESHOLD / 2);
      expect(chainingManager.chaining).toBe(false);
    });
  });

  describe("chaining getter", () => {
    it("should return the current chaining state", () => {
      expect(chainingManager.chaining).toBe(false);

      chainingManager.chaining = true;
      expect(chainingManager.chaining).toBe(true);

      chainingManager.chaining = false;
      expect(chainingManager.chaining).toBe(false);
    });
  });
});
