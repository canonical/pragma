/**
 * Regression: taking up ready rows a source cannot run reports why.
 *
 * Before the fix, the source run took up ready rows nothing ran under the
 * request they answer, and a source that then threw, or refused the query,
 * completed that settled identity — which publishes nothing. The rows read
 * ready while the source was not live, and every later publication retried
 * the take-up in silence.
 */

import { describe, expect, it } from "vitest";
import { byId, declare, pageOf } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import type { Source } from "../../lib/source/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

describe("regression 0034 — a take-up failure went unreported", () => {
  it("publishes the failure of a source that throws when taken up, over the rows it drew", () => {
    let executions = 0;
    const source: Source = {
      capabilities: declare({}),
      readDelivery: () => ({
        status: "succeeded",
        page: pageOf([{ id: "a" }]),
      }),
      execute() {
        executions += 1;
        throw new Error("the connection is gone");
      },
    };
    const provider = createDataViewsProvider({ collection: machines, source });
    provider.refresh();
    expect(provider.state.get().result.status).toBe("ready");
    const release = provider.observe();
    const { result } = provider.state.get();
    expect(result.status).toBe("refresh-failed");
    expect(result.problem).toMatchObject({
      status: "failed",
      failure: { reason: "the connection is gone" },
    });
    expect(result.rows).toEqual([{ id: "a" }]);
    // Once for the take-up, once for the request that reported it: settled.
    expect(executions).toBe(2);
    release();
  });
});
