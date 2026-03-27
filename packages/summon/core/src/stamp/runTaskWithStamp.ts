import { type Effect, runTask, type Task } from "@canonical/task";
import applyStamp from "./applyStamp.js";
import type { RunTaskWithStampOptions } from "./types.js";

/**
 * Run a task with stamp support. Wraps `runTask` from @canonical/task,
 * intercepting WriteFile effects to prepend generated-file stamps.
 */
export default async function runTaskWithStamp<A>(
  task: Task<A>,
  options: RunTaskWithStampOptions = {},
): Promise<A> {
  const { stamp, onEffectStart: userOnEffectStart, ...restOptions } = options;

  if (!stamp) {
    return runTask(task, options);
  }

  const onEffectStart = (effect: Effect) => {
    if (effect._tag === "WriteFile") {
      (effect as { content: string }).content = applyStamp(
        effect.path,
        effect.content,
        stamp,
      );
    }
    userOnEffectStart?.(effect);
  };

  return runTask(task, { ...restOptions, onEffectStart });
}
