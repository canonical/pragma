/**
 * Regression: a choice whose options are the server's reads back off the URL
 * as the option it was written as.
 *
 * Before the fix, such a field took any string or number as an option and
 * compared values by type. A record holding the number 42 was counted and
 * listed as 42, checking it applied `isAny [42]`, and that was written
 * `region=42` — which every reload, Back and GET submission read back as
 * `isAny ["42"]`, matching no record. The server's options are now text: a
 * value is matched, counted and listed by its text.
 */

import { describe, expect, it } from "vitest";
import { createCollection } from "../../lib/collection/index.js";
import { DEFAULT_WINDOW } from "../../lib/query/index.js";
import type { SourceDelivery } from "../../lib/result/index.js";
import { createArraySource } from "../../lib/source/index.js";
import { decodeQuery } from "../../lib/wire/index.js";

type Placed = { readonly id: string; readonly region: string | number };

const places = createCollection({
  identify: (row: Placed) => row.id,
  fields: [{ field: "region", kind: "choices" }],
});

const rows: readonly Placed[] = [
  { id: "numbered", region: 42 },
  { id: "spelled", region: "42" },
  { id: "named", region: "eu" },
];

describe("regression 0065 — server-owned numeric choice lost on reload", () => {
  it("finds the records a URL's option names, and lists that option once, as text", () => {
    const { slice } = decodeQuery({
      schema: places.schema,
      params: new URLSearchParams("region=42"),
    });
    const deliveries: SourceDelivery<Placed>[] = [];
    createArraySource({ rows, collection: places }).execute(
      {
        requestId: "reload",
        slice,
        window: DEFAULT_WINDOW,
        facets: ["region"],
      },
      (delivery) => {
        deliveries.push(delivery);
      },
    )();
    const answer = deliveries.at(-1);
    if (answer?.status !== "succeeded") {
      throw new Error("expected a page");
    }
    expect(answer.page.rows.map((row) => row.id)).toEqual([
      "numbered",
      "spelled",
    ]);
    expect(answer.page.facets).toEqual({
      region: {
        kind: "values",
        values: [
          { value: "42", count: { kind: "exact", value: 2 } },
          { value: "eu", count: { kind: "exact", value: 1 } },
        ],
      },
    });
  });
});
