import { createCollection } from "../src/lib/collection/index.js";
import { DEFAULT_WINDOW, type Slice } from "../src/lib/query/index.js";
import { createArraySource } from "../src/lib/source/index.js";

/** Named nodes, identified by id, their names text. */
const nodes = createCollection({
  identify: (row: { readonly id: string }) => row.id,
  fields: [{ field: "name", kind: "text" }],
});

/** The one query every ordering check runs: by name, ascending. */
const byName: Slice = {
  filter: [],
  search: null,
  sort: [{ field: "name", direction: "asc" }],
  group: [],
};

/**
 * Order named records by name through an array source declaring
 * `collation`, and answer their ids in the order the source delivers them.
 */
export default function orderNodesByName(
  rows: readonly { readonly id: string; readonly name: string }[],
  collation: string,
): readonly string[] {
  const source = createArraySource({ rows, collection: nodes, collation });
  const delivered: string[] = [];
  source.execute(
    { requestId: "r1", slice: byName, window: DEFAULT_WINDOW, facets: [] },
    (delivery) => {
      if (delivery.status === "succeeded") {
        delivered.push(...delivery.page.rows.map((row) => row.id));
      }
    },
  );
  return delivered;
}
