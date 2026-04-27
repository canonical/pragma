/**
 * A simple seeded pseudo-random number generator for use in tests/stories.
 */
export class SeededRandom {
  constructor(private seed: number = 42) {}

  /**
   * @returns A pseudo-random number between 0 and 1.
   */
  public random(): number {
    // Mulberry32 PRNG (https://github.com/cprosche/mulberry32)
    this.seed += 0x6d2b79f5;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * @returns A pseudo-random integer between `min` and `max` (inclusive).
   */
  public int(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * @returns A random element from the given array.
   */
  public pick<T>(arr: T[]): T {
    if (arr.length === 0) {
      throw new Error("SeededRandom.pick() requires a non-empty array.");
    }

    return arr[Math.floor(this.random() * arr.length)];
  }

  /**
   * @returns A pseudo-random Date between `start` and `end`.
   */
  public date(
    start: Date | string | number,
    end: Date | string | number,
  ): Date {
    return new Date(
      this.int(new Date(start).getTime(), new Date(end).getTime()),
    );
  }
}
