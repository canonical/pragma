import { describeError } from "../source/index.js";
import type {
  ViewCommandQueue,
  ViewCommandQueueConfig,
  ViewOutcome,
  ViewSettlement,
} from "./types.js";

/**
 * Create the session's command queue: commands run one at a time, in call
 * order, each prepared when its turn comes and settled to an outcome. A
 * refused name is answered to its caller and never published — it is the
 * name form's to show. A command still in flight when the generation moves
 * answers its caller and changes nothing. A listener that throws rejects
 * its own command, never the next one.
 *
 * @note Impure by design: the queue holds the chain of commands and the
 * generation they run in.
 */
export default function createCommandQueue(
  config: ViewCommandQueueConfig,
): ViewCommandQueue {
  const { publish } = config;
  let queue: Promise<unknown> = Promise.resolve();
  /** Bumped when the provider resets, so a command in flight answers nothing. */
  let generation = 0;

  return {
    run(command, prepare) {
      const ran = queue.then(async (): Promise<ViewOutcome> => {
        const at = generation;
        const prepared = prepare();
        if (typeof prepared !== "function") {
          if (prepared.status !== "invalid") {
            publish({
              command: { command, status: "settled", outcome: prepared },
            });
          }
          return prepared;
        }
        publish({ command: { command, status: "pending" } });
        const settled = await prepared().catch(
          (error: unknown): ViewSettlement => ({
            outcome: { status: "failed", reason: describeError(error) },
          }),
        );
        if (generation === at) {
          publish({
            ...settled.apply?.(),
            command: { command, status: "settled", outcome: settled.outcome },
          });
        }
        return settled.outcome;
      });
      queue = ran.catch(() => {});
      return ran;
    },
    abandon() {
      generation += 1;
    },
  };
}
