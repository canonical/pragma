/**
 * Regression: a filterable choice whose options are the server's cannot be
 * built without asking for its facet.
 *
 * Before the fix, such a field took its options from its facet alone, and a
 * provider left the facet out of its request without a word: the filter the
 * source declared offered nothing, and nothing said why. The provider now
 * refuses to be built that way, naming the field.
 */

import { describe, expect, it } from "vitest";
import createManualSource from "../../../testing/createManualSource.js";
import { byId } from "../../../testing/fixtures.js";
import { createCollection } from "../../lib/collection/index.js";
import { createDataViewsProvider } from "../../lib/provider/index.js";
import { declareCapabilities } from "../../lib/source/index.js";

const places = createCollection({
  identify: byId,
  fields: [{ field: "region", kind: "choices" }],
});

const capabilities = declareCapabilities(places, {
  filter: { region: true },
  facets: ["region"],
});

describe("regression 0072 — server-owned choice filter vanished without its facet", () => {
  it("refuses a provider that filters the field and asks for no facet of it", () => {
    expect(() =>
      createDataViewsProvider({
        collection: places,
        source: createManualSource({ capabilities }).source,
      }),
    ).toThrow(
      'the options of "region" are the server\'s, so the provider must ask for its facet',
    );
  });

  it("builds one that asks, and one whose source filters nothing there", () => {
    expect(() =>
      createDataViewsProvider({
        collection: places,
        source: createManualSource({ capabilities }).source,
        facets: ["region"],
      }),
    ).not.toThrow();
    expect(() =>
      createDataViewsProvider({
        collection: places,
        source: createManualSource({
          capabilities: declareCapabilities(places, {}),
        }).source,
      }),
    ).not.toThrow();
  });
});
