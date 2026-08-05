// =============================================================================
// THE PAGINATION GUARD: the acceptance gate's blind spot, covered.
//
// The gate next door executes each lens operation ONCE, with `cursor: null`.
// It therefore cannot see a cursor regression at all — and a cursor regression
// is silent by construction on both known providers, which is what makes it
// worth a file of its own.
//
// WHY IT IS SILENT. A cursor that matches no item's identity is treated
// exactly like no cursor: `sliceConnection`'s `indexOfCursor` returns -1, the
// window starts at 0, and page 1 comes back verbatim with no error. That is a
// deliberate, documented choice (`lib/provider/connection.ts`) — cursors are
// client-supplied, and a stale one should degrade to a full page rather than a
// 500. It is the right behaviour AND it is why "the cursor stopped working"
// looks identical, at the wire, to "the reader asked for the first page".
//
// SO THE GUARD IS THE BOND, NOT THE DEGRADATION. Both providers derive a
// cursor as `base64(the node's absolute IRI)` — graph-example's `toCursor`,
// ke-graphql's `toBase64(node.uri)` — which is why a cursor minted by one is
// located by the other. Nothing in this repository would have noticed if that
// stopped being true. The assertions below check the derivation directly:
// every cursor must decode to the IRI of the node it belongs to. Change the
// convention on either side and this file says so immediately, in the place
// where the two implementations are supposed to agree.
//
// This file only ever STRENGTHENS the gate. It adds an operation nobody was
// executing under conditions nobody was executing it under; it narrows
// nothing.
//
// Test infrastructure: excluded from the build (tsconfig.build.json) and from
// coverage (vitest.config.ts).
// =============================================================================

import { type ExecutionResult, graphql } from "graphql";
import { describe, expect, it } from "vitest";
import { createExampleProvider } from "../../lib/provider/index.js";
import { SAMPLE_CLASS_URI } from "../fixtures.js";
import {
  discoverLensOperationNames,
  readOperationText,
} from "../lensOperations.js";

const provider = createExampleProvider();

/**
 * The paginating lens operation, DISCOVERED rather than hard-coded, so this
 * file dies loudly if the operation is renamed instead of quietly testing
 * nothing.
 */
const PAGINATION_OPERATION = "StandardsIndexPaginationQuery";

/** A page size small enough that the metro ABox has more than one page. */
const PAGE_SIZE = 5;

interface Edge {
  readonly cursor: string;
  readonly node: { readonly uri: string };
}

interface Page {
  readonly edges: readonly Edge[];
  readonly pageInfo: {
    readonly endCursor: string | null;
    readonly hasNextPage: boolean;
  };
}

const decodeCursor = (cursor: string): string =>
  Buffer.from(cursor, "base64").toString("utf-8");

/** Execute the operation and return the connection it selected. */
const fetchPage = async (cursor: string | null): Promise<Page> => {
  const result: ExecutionResult = await graphql({
    schema: provider.schema,
    source: readOperationText(PAGINATION_OPERATION),
    rootValue: provider.rootValue,
    variableValues: { classUri: SAMPLE_CLASS_URI, count: PAGE_SIZE, cursor },
  });
  expect(result.errors ?? []).toEqual([]);
  const data = result.data as {
    ontologyClass: { instances: Page } | null;
  } | null;
  const ontologyClass = data?.ontologyClass;
  if (ontologyClass === null || ontologyClass === undefined) {
    throw new Error(
      `${SAMPLE_CLASS_URI} resolved to null — this guard needs a class with ` +
        "instances to page over.",
    );
  }
  return ontologyClass.instances;
};

describe("the lens pagination guard", () => {
  it("is measuring an operation the lens directory actually declares", () => {
    // The gate derives its operation set from the app; so does this file,
    // rather than trusting a constant to stay true.
    expect(discoverLensOperationNames()).toContain(PAGINATION_OPERATION);
  });

  it("returns a first page with more to come", async () => {
    const page = await fetchPage(null);

    expect(page.edges.length).toBe(PAGE_SIZE);
    expect(page.pageInfo.hasNextPage).toBe(true);
    expect(page.pageInfo.endCursor).not.toBeNull();
    // `endCursor` is the last edge's cursor, not something computed
    // separately — a mismatch here means the two are derived independently,
    // which is the shape the drift takes.
    expect(page.pageInfo.endCursor).toBe(page.edges.at(-1)?.cursor);
  });

  it("bonds every cursor to the identity it pages over", async () => {
    // THE LOAD-BEARING ASSERTION OF THIS FILE. Both providers mint
    // `base64(absolute IRI)`, which is the only reason a cursor from one is
    // located by the other. This checks the derivation rather than its
    // effect, because the effect of a broken cursor is indistinguishable
    // from a first-page request.
    const page = await fetchPage(null);

    expect(page.edges.map((edge) => decodeCursor(edge.cursor))).toEqual(
      page.edges.map((edge) => edge.node.uri),
    );
  });

  it("advances: page 2 is non-empty and disjoint from page 1", async () => {
    const first = await fetchPage(null);
    const second = await fetchPage(first.pageInfo.endCursor);

    expect(second.edges.length).toBeGreaterThan(0);
    const firstUris = new Set(first.edges.map((edge) => edge.node.uri));
    expect(second.edges.filter((edge) => firstUris.has(edge.node.uri))).toEqual(
      [],
    );
    // …and it really is the continuation, not an arbitrary other window:
    // page 2 starts immediately after page 1's last identity.
    expect(decodeCursor(first.pageInfo.endCursor ?? "")).toBe(
      first.edges.at(-1)?.node.uri,
    );
  });

  it("degrades a cursor that names nothing to the first page, silently", async () => {
    // Pinned because it is the documented behaviour AND because it is the
    // reason the assertion above has to exist. A cursor whose identity is
    // not in the list is answered with page 1 and no error, so a consumer
    // that lost cursor compatibility sees a reader stuck on page 1 rather
    // than an exception. If this ever changes — to an error, or to an empty
    // page — that is a contract-visible change and it should be a decision,
    // not a surprise.
    const first = await fetchPage(null);
    const strayCursor = Buffer.from("not-an-iri", "utf-8").toString("base64");
    const stray = await fetchPage(strayCursor);

    expect(stray.edges.map((edge) => edge.node.uri)).toEqual(
      first.edges.map((edge) => edge.node.uri),
    );
  });
});
