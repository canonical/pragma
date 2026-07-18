/**
 * Perf measurement helper for the compiled `pragma` binary.
 *
 * Spawns the standalone binary N times, discards warmups, and reports the
 * median and p95 of the wall-clock durations. Kept dependency-free (only
 * `node:child_process`) so it can run inside vitest without touching the
 * kernel's import graph. Wired up by the perf-spike commit; the skeleton
 * lands early so the budget module and its consumers type-check from commit 1.
 */

import { spawnSync } from "node:child_process";

/** Outcome of a spawn-based measurement run. */
export interface MeasureResult {
  /** Median duration across the kept samples, in milliseconds. */
  readonly medianMs: number;
  /** 95th-percentile duration across the kept samples, in milliseconds. */
  readonly p95Ms: number;
  /**
   * 10%-trimmed mean across the kept samples, in milliseconds — the robust
   * central estimate the budget suite enforces. Unlike a nearest-rank p95 over a
   * small sample (effectively the max), it is not dominated by a single
   * GC/scheduler spike, so it holds a ceiling reliably under CPU contention.
   */
  readonly trimmedMeanMs: number;
  /** Every kept sample (warmups already discarded), in milliseconds. */
  readonly samplesMs: readonly number[];
}

/** Options for {@link measureCommand}. */
export interface MeasureOptions {
  /** Total spawns to perform. */
  readonly runs?: number;
  /** Leading spawns to discard before sampling. */
  readonly warmups?: number;
  /** Extra environment overlaid on the child process env. */
  readonly env?: Record<string, string>;
}

/** The percentile `p` (0–1) of a numeric sample, using nearest-rank. */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const rank = Math.ceil(p * sorted.length);
  const index = Math.min(Math.max(rank, 1), sorted.length) - 1;
  return sorted[index] as number;
}

/**
 * The mean of a sorted sample after trimming the fastest and slowest `trim`
 * fraction from each end. Far less sensitive than a small-sample p95 (which is
 * effectively the max) to the occasional spawn spike, so it estimates typical
 * latency and holds a ceiling reliably under whole-suite CPU contention.
 */
export function trimmedMean(sorted: readonly number[], trim = 0.1): number {
  if (sorted.length === 0) return Number.NaN;
  const cut = Math.floor(sorted.length * trim);
  const body =
    2 * cut < sorted.length ? sorted.slice(cut, sorted.length - cut) : sorted;
  return body.reduce((sum, value) => sum + value, 0) / body.length;
}

/**
 * Measure the wall-clock cost of running `binary args…` repeatedly.
 *
 * @param binary - Absolute path to the compiled binary.
 * @param args - Arguments passed on each spawn.
 * @param options - Run/warmup counts and env overlay.
 * @returns Median, p95, and the kept samples.
 * @note Impure — spawns child processes.
 */
export function measureCommand(
  binary: string,
  args: readonly string[],
  options: MeasureOptions = {},
): MeasureResult {
  const runs = options.runs ?? 30;
  const warmups = options.warmups ?? 3;
  const samples: number[] = [];

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    spawnSync(binary, [...args], {
      env: { ...process.env, ...options.env },
      stdio: "ignore",
    });
    const elapsed = performance.now() - start;
    if (i >= warmups) samples.push(elapsed);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  return {
    medianMs: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    trimmedMeanMs: trimmedMean(sorted, 0.1),
    samplesMs: samples,
  };
}
