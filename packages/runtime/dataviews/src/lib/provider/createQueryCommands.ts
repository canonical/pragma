import {
  applyQueryCommand,
  type Query,
  type QueryCommand,
} from "../query/index.js";
import type { SourceRefusal } from "../result/index.js";
import type { RowRecord } from "../rows/index.js";
import { refusalsOf } from "../source/index.js";
import { CAUSE_OF_COMMAND } from "./constants.js";
import listIncurredRefusals from "./listIncurredRefusals.js";
import type {
  AdoptionCause,
  QueryCommands,
  QueryCommandsConfig,
  TransitionCause,
} from "./types.js";

/** What every applied command answers with: no refusal, one frozen list. */
const NO_REFUSALS: readonly SourceRefusal[] = Object.freeze([]);

/**
 * Create the provider's query path: the refusal check every command and
 * every request goes through, the command boundary, and the two moves the
 * ports make — adopting an authoritative query and asking again.
 *
 * A command is applied as a coherent transition: refused at the boundary
 * when it would make the query one the source cannot execute — nothing
 * published, requested or written — and dispatched otherwise. Only the
 * refusals the command itself incurs count: a query already carrying a
 * clause the source refuses, adopted from a saved view or a link, still
 * takes the command that removes it, and any other that does not add to
 * its trouble. A command the grammar rejects is a programmer error and
 * throws.
 *
 * Every move is announced as a transition once its state is published:
 * what moved the query and how the move enters history, by the policy.
 *
 * @note Impure by design: every accepted command moves the coordinator,
 * publishes its state and announces the transition.
 */
export default function createQueryCommands<TRow extends object = RowRecord>(
  config: QueryCommandsConfig<TRow>,
): QueryCommands {
  const { coordinator, capabilities, source, publish, transitions, history } =
    config;

  /** Publish the state the coordinator reached, then announce the move. */
  const announce = (cause: TransitionCause): void => {
    publish();
    const { slice, window } = coordinator.state;
    transitions.set({
      query: { slice, window },
      cause,
      history: history[cause],
    });
  };

  const refusals = (query: Query): readonly SourceRefusal[] => {
    const declared = refusalsOf(capabilities, query);
    if (declared.length > 0) {
      // The source's own check reads state that a refused request never
      // reaches; asking it about one would be asking a question it has no
      // answer for.
      return declared;
    }
    const own = source.refusals?.(query) ?? NO_REFUSALS;
    // Copied for the same reason a delivered page is: what a source hands
    // over reaches published state, and must not move under it afterwards.
    return own.length === 0 ? NO_REFUSALS : Object.freeze([...own]);
  };

  return {
    refusals,
    command(next: QueryCommand): readonly SourceRefusal[] {
      const { slice, window } = coordinator.state;
      const applied = applyQueryCommand(slice, window, next);
      if (applied.status === "rejected") {
        throw new Error(applied.reason);
      }
      if (!applied.sliceChanged && !applied.windowChanged) {
        return NO_REFUSALS;
      }
      // The query the command starts from is checked only when the one it
      // produces is refused at all — the rare path.
      const after = refusals({ slice: applied.slice, window: applied.window });
      const incurred =
        after.length === 0
          ? after
          : listIncurredRefusals(refusals({ slice, window }), after);
      if (incurred.length > 0) {
        return incurred;
      }
      // Applied above to a copy, and here for real: the same command over
      // the same state, so what moved there moves here and issues a request.
      coordinator.dispatch(next);
      announce(CAUSE_OF_COMMAND[next.kind]);
      return NO_REFUSALS;
    },
    adopt(query: Query, cause: AdoptionCause): string | null {
      const requestId = coordinator.adopt(query);
      if (requestId !== null) {
        announce(cause);
      }
      return requestId;
    },
    refresh(): string {
      const requestId = coordinator.refresh();
      publish();
      return requestId;
    },
  };
}
