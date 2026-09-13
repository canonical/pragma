/**
 * Regression: a provider observed again after its request settled must
 * bring its source back to life.
 *
 * Before the fix, the first observer asked for a page only when the state
 * was idle. A source that answered during a first observation — a local
 * array, a warm cache — left the state ready; the last release stopped its
 * execution; and the next observer, finding nothing pending and nothing
 * idle, started nothing. The rows stayed on screen while the source had no
 * live execution, so a later change to the same query never reached them.
 * A StrictMode rehearsal mount is exactly that sequence.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { answering, byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

describe("regression 0005 — a settled provider observed again keeps its source live", () => {
  it("asks for the current page again, so the source has a live execution", () => {
    const source = createManualSource({
      capabilities: declare({}),
      answer: answering([{ id: "a" }]),
    });
    const provider = createDataViewsProvider({
      collection: machines,
      source: source.source,
    });
    const rehearsal = provider.observe();
    expect(provider.state.get().result.status).toBe("ready");
    rehearsal();
    expect(source.callAt(0).releases).toBe(1);

    const release = provider.observe();
    // The rows stay while the same query is asked again, and the source
    // holds a live execution for it.
    expect(source.calls).toHaveLength(2);
    expect(source.callAt(1).releases).toBe(0);
    expect(provider.state.get().result.status).toBe("ready");
    expect(provider.rows.get().ids).toEqual(["a"]);
    release();
    expect(source.callAt(1).releases).toBe(1);
  });
});
