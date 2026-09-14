/**
 * Regression: rows drawn before hydrating are not asked for again on mount.
 *
 * Before the fix, a provider whose rows `refresh()` drew while nothing
 * observed it was asked for the same page again by its first observer: the
 * state went `refreshing` — the table busy — and came back ready with a new
 * result, two publications and a second round trip right after hydration,
 * for a page the screen already showed.
 */

import { describe, expect, it } from "vitest";
import { byId } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import { createArraySource } from "../../lib/source/index.js";

const machines = createCollection({
  identify: byId,
  fields: [{ field: "cpu", kind: "number" }],
});

describe("regression 0030 — hydrated rows were asked for again", () => {
  it("takes the source up over the drawn rows with no publication, and stays live", () => {
    const source = createArraySource({
      rows: [{ id: "a", cpu: 1 }],
      collection: machines,
    });
    const provider = createDataViewsProvider({ collection: machines, source });
    provider.refresh();
    const drawn = provider.state.get();
    expect(drawn.result.status).toBe("ready");
    const published: string[] = [];
    provider.state.subscribe(() => {
      published.push(provider.state.get().result.status);
    });

    const release = provider.observe();
    expect(published).toEqual([]);
    expect(provider.state.get()).toBe(drawn);

    // Live: a change to the rows reaches the provider.
    source.setRows([
      { id: "a", cpu: 1 },
      { id: "b", cpu: 2 },
    ]);
    expect(provider.rows.get().ids).toEqual(["a", "b"]);
    release();
  });
});
