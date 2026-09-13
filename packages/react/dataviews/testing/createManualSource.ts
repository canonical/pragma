import type { Source } from "@canonical/dataviews-core";
import type { ManualCall, ManualSource, ManualSourceConfig } from "./types.js";

/**
 * Create a source whose executions a test drives by hand: every request
 * is recorded with the function that answers it, and the release of each
 * execution is counted. With `answer`, every request is answered
 * synchronously, the way the array source answers — a mounted table then
 * shows its rows on the first render after its effect.
 */
export default function createManualSource<TRow extends object>(
  config: ManualSourceConfig<TRow>,
): ManualSource<TRow> {
  const calls: ManualCall<TRow>[] = [];
  const source: Source<TRow> = {
    capabilities: config.capabilities,
    ...(config.refusals === undefined ? {} : { refusals: config.refusals }),
    ...(config.runAction === undefined ? {} : { runAction: config.runAction }),
    execute(request, deliver) {
      const call: ManualCall<TRow> = { request, deliver, releases: 0 };
      calls.push(call);
      if (config.answer !== undefined) {
        deliver({ status: "succeeded", page: config.answer(request) });
      }
      return () => {
        call.releases += 1;
      };
    },
  };
  const callAt = (index: number): ManualCall<TRow> => {
    const call = calls[index];
    if (call === undefined) {
      throw new Error(`expected an execution at index ${index}`);
    }
    return call;
  };
  return {
    source,
    calls,
    callAt,
    latest: () => callAt(calls.length - 1),
  };
}
