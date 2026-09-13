/**
 * Regression: a filter record's own edit must not be read back as the
 * query moving under it.
 *
 * Before the fix, the record applied its predicate through the host, which
 * published before returning; the root's sync then compared the canonical
 * copy against the record's still-previous predicate, took it for an
 * external move, and adopted it — rewriting the text under the cursor
 * (`4.0` became `4`) and, after a direct `set`, showing the first sorted
 * operand in an input the control had just emptied.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId, declare } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createFilterInputs } from "../../lib/filter/index.js";
import {
  createDataViewsProvider,
  readProviderHost,
} from "../../lib/provider/index.js";

const machines = createCollection({
  identify: byId,
  fields: [
    { field: "status", kind: "choices", options: ["failed", "cancelled"] },
    { field: "cpu", kind: "number", min: 0 },
  ],
});

describe("regression 0007 — a record's own edit is not an external move", () => {
  it("keeps the typed text and the emptied input through the provider's echo", () => {
    const provider = createDataViewsProvider({
      collection: machines,
      source: createManualSource({
        capabilities: declare({
          filter: { status: ["eq"], cpu: ["gte", "lte"] },
        }),
      }).source,
    });
    const inputs = createFilterInputs({ host: readProviderHost(provider) });
    const stop = inputs.observe();
    inputs.handles.cpu.gte.edit("4.0");
    expect(inputs.handles.cpu.gte.state.get()).toMatchObject({
      input: "4.0",
      feedback: { status: "applied" },
    });
    expect(inputs.handles.status.eq.set(["failed", "cancelled"])).toEqual([]);
    expect(inputs.handles.status.eq.state.get()).toMatchObject({
      input: "",
      feedback: { status: "applied" },
    });
    stop();
  });
});
