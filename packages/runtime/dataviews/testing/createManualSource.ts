import type { SourceDelivery } from "../src/lib/result/index.js";
import type { RowRecord } from "../src/lib/rows/index.js";
import type { Source, SourceRequest } from "../src/lib/source/index.js";
import { NOTHING_DECLARED } from "./fixtures.js";
import type { ManualCall, ManualSource, ManualSourceConfig } from "./types.js";

/**
 * Create a source whose executions a test drives by hand: every request
 * is recorded with the function that answers it, and the release of each
 * execution is counted. With `answer`, every request is answered
 * synchronously, the way the array source answers, and read within the call
 * without an execution; without it, nothing answers until it runs.
 *
 * @note Impure by design: it records every execution and counts every
 * release, into the lists it hands back for a test to read.
 */
export default function createManualSource<TRow extends object = RowRecord>(
  config: ManualSourceConfig<TRow> = {},
): ManualSource<TRow> {
  const calls: ManualCall<TRow>[] = [];
  const { answer } = config;
  const source: Source<TRow> = {
    capabilities: config.capabilities ?? NOTHING_DECLARED,
    ...(config.refusals === undefined ? {} : { refusals: config.refusals }),
    ...(config.runAction === undefined ? {} : { runAction: config.runAction }),
    ...(answer === undefined
      ? {}
      : {
          readDelivery: (request: SourceRequest): SourceDelivery<TRow> => ({
            status: "succeeded",
            page: answer(request),
          }),
        }),
    execute(request, deliver) {
      const call: ManualCall<TRow> = { request, deliver, releases: 0 };
      calls.push(call);
      if (answer !== undefined) {
        deliver({ status: "succeeded", page: answer(request) });
      }
      return () => {
        call.releases += 1;
      };
    },
  };
  const callAt = (index: number): ManualCall<TRow> => {
    const call = calls.at(index);
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
