import type { Task } from "@canonical/task";
import { runTask } from "@canonical/task/node";
import createStampOnEffectStart from "./createStampOnEffectStart.js";
import type { RunTaskWithStampOptions } from "./types.js";

/**
 * Run a task with stamp support. Wraps `runTask` from @canonical/task,
 * routing every WriteFile through THE stamping transform
 * ({@link createStampOnEffectStart}) — one transform for both stamping seams,
 * so the verbatim (carried-copy) skip can never diverge between them.
 */
export default async function runTaskWithStamp<A>(
  task: Task<A>,
  options: RunTaskWithStampOptions = {},
): Promise<A> {
  const { stamp, onEffectStart: userOnEffectStart, ...restOptions } = options;

  if (!stamp) {
    return runTask(task, options);
  }

  return runTask(task, {
    ...restOptions,
    onEffectStart: createStampOnEffectStart(stamp, userOnEffectStart),
  });
}
