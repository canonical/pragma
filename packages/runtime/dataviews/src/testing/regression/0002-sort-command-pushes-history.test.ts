/**
 * Regression: sorting a column must leave a history entry to go back to.
 *
 * Before the fix, every host transition entered history in the binding's
 * configured mode, which defaults to `replace` so a stream of filter edits
 * does not bury the entry the reader arrived on — and a sort command was
 * buried with them, so Back skipped the order the rows had been in.
 */

import { describe, expect, it } from "vitest";
import {
  createLocationBinding,
  createMemoryLocation,
  type Location,
} from "../../lib/location/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import { createSchema } from "../../lib/schema/index.js";

const schema = createSchema([
  { field: "cpu", kind: "number" },
  { field: "status", kind: "choices", options: ["failed", "ready"] },
]);

/** A memory location recording the history mode of every write. */
const recordWrites = (href: string) => {
  const memory = createMemoryLocation({ href });
  const modes: string[] = [];
  const location: Location = {
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
    const provider = createDataViewsProvider({ schema });
    const { location, modes } = recordWrites("/machines");
    const release = createLocationBinding({
      host: provider,
      location,
    }).observe();
    provider.setSort([{ field: "cpu", direction: "desc" }]);
    provider.fields.status.eq.set(["failed"]);
    expect(modes).toEqual(["replace", "push", "replace"]);
    expect(location.read().getAll("sort")).toEqual(["cpu__desc"]);
    release();
  });
});
