/**
 * Regression: an observation whose replayed command fails to write leaves
 * nothing subscribed.
 *
 * Before the fix, a command issued while an observation's first pass ran was
 * written after the loop had subscribed to the location and the host. A
 * location refusing that write threw out of `observe()` before it returned
 * its release, and both subscriptions stayed behind with no way to remove
 * them.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createMemoryLocation,
  type QueryLocation,
} from "../../lib/location/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";

const collection = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "running"] },
  ],
});

describe("regression 0052 — a failing replay left the loop subscribed", () => {
  it("releases the location and the host when the replayed write throws", () => {
    const memory = createMemoryLocation({ href: "/machines?status=running" });
    let subscribed = 0;
    let written = 0;
    const location: QueryLocation = {
      ...memory,
      write(next, options) {
        if (next.get("status") === "running") {
          throw new Error("navigation refused");
        }
        written += 1;
        memory.write(next, options);
      },
      subscribe(listener) {
        subscribed += 1;
        const stop = memory.subscribe(listener);
        return () => {
          subscribed -= 1;
          stop();
        };
      },
    };
    const provider = createDataViewsProvider({
      collection,
      source: createManualSource({
        capabilities: declare({ filter: { status: ["eq"] } }),
        answer: answering([]),
      }).source,
      location,
    });
    // Moved while nothing observed, so the first pass adopts.
    location.write(new URLSearchParams("status=failed"));
    const host = readProviderHost(provider);
    let commanded = false;
    provider.state.subscribe(() => {
      if (!commanded) {
        commanded = true;
        host.setPredicate({
          field: "status",
          operator: "eq",
          operands: ["running"],
        });
      }
    });
    expect(() => provider.observe()).toThrow("navigation refused");
    expect(subscribed).toBe(0);
    // Nor does the loop still hear the host: a later reset, whose spelling the
    // location does not carry, writes nothing.
    const before = written;
    provider.reset();
    expect(written).toBe(before);
  });
});
