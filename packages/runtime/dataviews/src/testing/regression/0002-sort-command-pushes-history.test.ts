/**
 * Regression: sorting a column must leave a history entry to go back to.
 *
 * Before the fix, every host transition entered history in the provider's
 * configured mode, which defaults to `replace` so a stream of filter edits
 * does not bury the entry the reader arrived on — and a sort command was
 * buried with them, so Back skipped the order the rows had been in.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare, declareSort } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import {
  createMemoryLocation,
  type QueryLocation,
} from "../../lib/location/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "cpu", kind: "number" },
    { field: "status", kind: "choices", options: ["failed", "ready"] },
  ],
});

/** A memory location recording the history mode of every write. */
const recordWrites = (href: string) => {
  const memory = createMemoryLocation({ href });
  const modes: string[] = [];
  const location: QueryLocation = {
    ...memory,
    write(next, options) {
      modes.push(options?.history ?? "replace");
      memory.write(next, options);
    },
  };
  return { location, modes };
};

describe("regression 0002 — a sort command pushes a history entry", () => {
  it("pushes for the sort and replaces for the filter that follows it", () => {
    const { location, modes } = recordWrites("/machines");
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({
          filter: { status: ["eq"] },
          sort: declareSort(["cpu"]),
        }),
      }).source,
      location,
    });
    const release = provider.observe();
    provider.setSort([{ field: "cpu", direction: "desc" }]);
    readProviderHost(provider).setPredicate({
      field: "status",
      operator: "eq",
      operands: ["failed"],
    });
    expect(modes).toEqual(["replace", "push", "replace"]);
    expect(location.read().getAll("sort")).toEqual(["cpu__desc"]);
    release();
  });
});
