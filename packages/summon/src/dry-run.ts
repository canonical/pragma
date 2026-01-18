/**
 * Dry-Run Interpreter
 *
 * This module provides interpreters for testing and previewing tasks
 * without actually executing their effects.
 */

import { TaskExecutionError } from "./interpreter.js";
import type { DryRunResult, Effect, Task } from "./types.js";

// =============================================================================
// Mock Effect Results
// =============================================================================

/**
 * Generate a mock result for an effect.
 * This allows tasks to continue executing in dry-run mode.
 */
export const mockEffect = (effect: Effect): unknown => {
  switch (effect._tag) {
    case "ReadFile":
      return `[mock content of ${effect.path}]`;

    case "WriteFile":
    case "AppendFile":
    case "CopyFile":
    case "CopyDirectory":
    case "DeleteFile":
    case "DeleteDirectory":
    case "MakeDir":
    case "Log":
    case "WriteContext":
      return undefined;

    case "Exists":
      return true;

    case "Glob":
      return [];

    case "Exec":
      return { stdout: "", stderr: "", exitCode: 0 };

    case "Prompt":
      // Return default or first choice
      switch (effect.question.type) {
        case "text":
          return effect.question.default ?? "";
        case "confirm":
          return effect.question.default ?? false;
        case "select":
          return (
            effect.question.default ?? effect.question.choices[0]?.value ?? ""
          );
        case "multiselect":
          return effect.question.default ?? [];
      }
      break;

    case "ReadContext":
      return undefined;

    case "Parallel":
      return effect.tasks.map((t) => {
        const result = dryRun(t);
        return result.value;
      });

    case "Race":
      if (effect.tasks.length > 0) {
        return dryRun(effect.tasks[0]).value;
      }
      return undefined;
  }
};

// =============================================================================
// Dry-Run Interpreter
// =============================================================================

/**
 * Run a task in dry-run mode, collecting effects without executing them.
 */
export const dryRun = <A>(task: Task<A>): DryRunResult<A> => {
  const effects: Effect[] = [];

  const run = (t: Task<A>): A => {
    switch (t._tag) {
      case "Pure":
        return t.value;

      case "Fail":
        throw new TaskExecutionError(t.error);

      case "Effect": {
        effects.push(t.effect);
        const mockResult = mockEffect(t.effect);
        return run(t.cont(mockResult));
      }
    }
  };

  const value = run(task);
  return { value, effects };
};

/**
 * Run a task in dry-run mode with custom mock values.
 */
export const dryRunWith = <A>(
  task: Task<A>,
  mocks: Map<string, (effect: Effect) => unknown>,
): DryRunResult<A> => {
  const effects: Effect[] = [];

  const getMock = (effect: Effect): unknown => {
    const customMock = mocks.get(effect._tag);
    if (customMock) {
      return customMock(effect);
    }
    return mockEffect(effect);
  };

  const run = (t: Task<A>): A => {
    switch (t._tag) {
      case "Pure":
        return t.value;

      case "Fail":
        throw new TaskExecutionError(t.error);

      case "Effect": {
        effects.push(t.effect);
        const mockResult = getMock(t.effect);
        return run(t.cont(mockResult));
      }
    }
  };

  const value = run(task);
  return { value, effects };
};

// =============================================================================
// Effect Collection
// =============================================================================

/**
 * Collect all effects from a task without running to completion.
 * Useful for testing what effects a task would produce.
 */
export const collectEffects = <A>(task: Task<A>): Effect[] => {
  const effects: Effect[] = [];

  const collect = (t: Task<unknown>): void => {
    switch (t._tag) {
      case "Pure":
      case "Fail":
        return;

      case "Effect":
        effects.push(t.effect);
        collect(t.cont(mockEffect(t.effect)));
    }
  };

  collect(task);
  return effects;
};

/**
 * Count the number of effects of each type.
 */
export const countEffects = (effects: Effect[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const effect of effects) {
    counts[effect._tag] = (counts[effect._tag] ?? 0) + 1;
  }
  return counts;
};

/**
 * Filter effects by type.
 */
export const filterEffects = <T extends Effect["_tag"]>(
  effects: Effect[],
  tag: T,
): Array<Extract<Effect, { _tag: T }>> =>
  effects.filter((e): e is Extract<Effect, { _tag: T }> => e._tag === tag);

/**
 * Get all file write operations from effects.
 */
export const getFileWrites = (
  effects: Effect[],
): Array<{ path: string; content: string }> =>
  filterEffects(effects, "WriteFile").map((e) => ({
    path: e.path,
    content: e.content,
  }));

/**
 * Get all file paths that would be created/modified.
 */
export const getAffectedFiles = (effects: Effect[]): string[] => {
  const files = new Set<string>();

  for (const effect of effects) {
    switch (effect._tag) {
      case "WriteFile":
      case "AppendFile":
      case "DeleteFile":
        files.add(effect.path);
        break;
      case "CopyFile":
        files.add(effect.dest);
        break;
      case "MakeDir":
        files.add(effect.path);
        break;
    }
  }

  return Array.from(files).sort();
};

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Assert that a task produces specific effects.
 */
export const assertEffects = <A>(
  task: Task<A>,
  expectedEffects: Partial<Effect>[],
): void => {
  const { effects } = dryRun(task);

  if (effects.length !== expectedEffects.length) {
    throw new Error(
      `Expected ${expectedEffects.length} effects, got ${effects.length}`,
    );
  }

  for (let i = 0; i < effects.length; i++) {
    const actual = effects[i];
    const expected = expectedEffects[i];

    for (const [key, value] of Object.entries(expected)) {
      if ((actual as Record<string, unknown>)[key] !== value) {
        throw new Error(
          `Effect ${i}: expected ${key} to be ${JSON.stringify(value)}, got ${JSON.stringify((actual as Record<string, unknown>)[key])}`,
        );
      }
    }
  }
};

/**
 * Assert that a task would write specific files.
 */
export const assertFileWrites = <A>(
  task: Task<A>,
  expectedFiles: string[],
): void => {
  const { effects } = dryRun(task);
  const actualFiles = getAffectedFiles(effects);
  const expected = expectedFiles.sort();

  if (actualFiles.length !== expected.length) {
    throw new Error(
      `Expected ${expected.length} file writes, got ${actualFiles.length}\n` +
        `Expected: ${expected.join(", ")}\n` +
        `Actual: ${actualFiles.join(", ")}`,
    );
  }

  for (let i = 0; i < expected.length; i++) {
    if (actualFiles[i] !== expected[i]) {
      throw new Error(`Expected file ${expected[i]}, got ${actualFiles[i]}`);
    }
  }
};

/**
 * Create a task result matcher for testing.
 */
export const expectTask = <A>(task: Task<A>) => {
  const result = dryRun(task);

  return {
    toHaveValue: (expected: A) => {
      if (result.value !== expected) {
        throw new Error(
          `Expected value ${JSON.stringify(expected)}, got ${JSON.stringify(result.value)}`,
        );
      }
    },

    toHaveEffectCount: (count: number) => {
      if (result.effects.length !== count) {
        throw new Error(
          `Expected ${count} effects, got ${result.effects.length}`,
        );
      }
    },

    toWriteFile: (path: string) => {
      const writes = filterEffects(result.effects, "WriteFile");
      if (!writes.some((w) => w.path === path)) {
        throw new Error(`Expected task to write file ${path}`);
      }
    },

    toNotWriteFile: (path: string) => {
      const writes = filterEffects(result.effects, "WriteFile");
      if (writes.some((w) => w.path === path)) {
        throw new Error(`Expected task to not write file ${path}`);
      }
    },

    effects: result.effects,
    value: result.value,
  };
};
