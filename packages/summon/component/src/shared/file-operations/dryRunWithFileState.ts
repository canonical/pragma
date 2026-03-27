import { dryRunWith, type Effect, type Task } from "@canonical/task";

/**
 * dryRunWith that mocks ReadFile and Exists to simulate file state.
 * Test-only helper for file operation tests.
 */
export default function dryRunWithFileState<A>(
  task: Task<A>,
  files: Record<string, string>,
) {
  const mocks = new Map<string, (effect: Effect) => unknown>([
    [
      "ReadFile",
      (effect) => {
        const e = effect as { path: string };
        return files[e.path] ?? "";
      },
    ],
    [
      "Exists",
      (effect) => {
        const e = effect as { path: string };
        return e.path in files;
      },
    ],
  ]);
  return dryRunWith(task, mocks);
}
