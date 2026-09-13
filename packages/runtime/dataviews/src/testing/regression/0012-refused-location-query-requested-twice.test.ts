/**
 * Regression: a location query the source refuses is refused once on start.
 *
 * Before the fix, the first observer adopted the location, the source
 * refused the request at once, and the provider — finding no request
 * pending — asked for the same query again, to be refused again: two
 * publications and a pending-then-failed flicker for one adoption.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createMemoryLocation } from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

describe("regression 0012 — a refused location query is refused once", () => {
  it("publishes one refusal and asks for nothing more", () => {
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({}),
        // The source reaches page one only, as a cursor-less endpoint might.
        refusals: (query) =>
          query.window.page > 1
            ? [
                {
                  part: "window",
                  code: "unreachable-page",
                  field: null,
                  operator: null,
                  reason: "this source reaches its first page only",
                },
              ]
            : [],
      }).source,
      location: createMemoryLocation({ href: "/machines?page=3" }),
    });
    const statuses: string[] = [];
    provider.state.subscribe(() => {
      statuses.push(provider.state.get().result.status);
    });
    const release = provider.observe();
    expect(statuses).toEqual(["pending", "failed"]);
    expect(provider.state.get().result.problem?.status).toBe("refused");
    release();
  });
});
