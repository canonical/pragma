import { Link } from "@canonical/router-react";
import type React from "react";
import { graphql, usePaginationFragment } from "react-relay";
import type { StandardsIndex_query$key } from "#relay/__generated__/StandardsIndex_query.graphql.js";
import standardsIndexFragmentNode from "#relay/__generated__/StandardsIndex_query.graphql.js";
import type { StandardsIndexPaginationQuery } from "#relay/__generated__/StandardsIndexPaginationQuery.graphql.js";
import { STANDARDS_PAGE_SIZE } from "../standardsIndexQuery.js";
import type { StandardsIndexProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `StandardsIndex_query` (see `EntityHeader`
 * for the native-import rationale). The `@connection` key + `@refetchable`
 * generate `StandardsIndexPaginationQuery` for `loadNext`. Never invoked.
 *
 * `categories(first: 1)` is the GROUPING key only: verified live, every
 * standard carries exactly one category (131/131), and the index files a
 * standard under its first. The reading page's article shows the full
 * category set.
 */
const standardsIndexFragmentSource = (): unknown => graphql`
  fragment StandardsIndex_query on Query
  @argumentDefinitions(
    count: { type: "Int!" }
    cursor: { type: "String" }
  )
  @refetchable(queryName: "StandardsIndexPaginationQuery") {
    codeStandards(first: $count, after: $cursor)
      @connection(key: "StandardsIndex_codeStandards") {
      edges {
        node {
          id
          uri
          name
          categories(first: 1) {
            edges {
              node {
                id
                slug
              }
            }
          }
        }
      }
    }
  }
`;
void standardsIndexFragmentSource;

const componentCssClassName = "ds standards-index";

/** The category bucket for standards whose graph category is absent —
 * the schema allows a zero-edge connection even though the live graph
 * currently has none (131/131 categorised). */
const UNCATEGORISED = "uncategorised";

/** Anchor id for a category's section (the jump-link targets). */
const categoryAnchorId = (slug: string): string =>
  `standards-category-${slug.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;

/**
 * Category order: alphabetical slugs (no Global-first analogue exists for
 * the cs: vocabulary — categories are peer topics), Uncategorised last.
 */
const compareCategories = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a === UNCATEGORISED) return 1;
  if (b === UNCATEGORISED) return -1;
  return a.localeCompare(b, "en");
};

/**
 * The index's composed layout: category jump-links west (the mode's
 * secondary nav), category-grouped reading lists east. Pagination is
 * Relay's connection machinery over the schema's hard 100-item page cap
 * (ke-graphql MAX_PAGE_SIZE — not configurable), surfaced as an explicit
 * "Load more" button rather than an invisible truncation (the catalog's
 * ruling R1 — the live graph carries 131 standards, MORE than one page,
 * so the button is load-bearing here); cursors are opaque server state,
 * never derived client-side.
 */
const StandardsIndex = ({
  className,
  query,
}: StandardsIndexProps): React.ReactElement => {
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    StandardsIndexPaginationQuery,
    StandardsIndex_query$key
  >(standardsIndexFragmentNode, query);

  const edges = data.codeStandards.edges;
  const groups = new Map<string, (typeof edges)[number]["node"][]>();
  for (const { node } of edges) {
    const slug = node.categories.edges.at(0)?.node.slug ?? UNCATEGORISED;
    const bucket = groups.get(slug) ?? [];
    bucket.push(node);
    groups.set(slug, bucket);
  }
  const categorySlugs = [...groups.keys()].sort(compareCategories);

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <nav aria-label="Categories" data-region="secondary-nav">
        <ul className="standards-category-links">
          {categorySlugs.map((slug) => (
            <li key={slug}>
              <a href={`#${categoryAnchorId(slug)}`}>{slug}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="standards-groups" data-region="canvas">
        {/* Unreachable while the live graph carries standards, cheap to
            have: a zero-edge connection renders an honest empty state
            rather than a blank canvas. */}
        {categorySlugs.length === 0 ? (
          <p className="standards-empty">No standards in the graph.</p>
        ) : null}
        {categorySlugs.map((slug) => (
          <section
            aria-labelledby={`${categoryAnchorId(slug)}-title`}
            id={categoryAnchorId(slug)}
            key={slug}
          >
            <h3 id={`${categoryAnchorId(slug)}-title`}>{slug}</h3>
            <ul className="standards-list">
              {(groups.get(slug) ?? []).map((node) => (
                <li key={node.id}>
                  {/* Link text: the human title when the graph has one
                      (4/131 at capture), else the prefixed URI — never a
                      fabricated title. The address round-trips the D31
                      pin in routeQueries.tests.ts. */}
                  <Link params={{ uri: node.uri }} to="standardEntity">
                    {node.name ?? node.uri}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {hasNext ? (
          <p className="standards-more">
            {/* The cap is the server's (R1): the page holds the first 100;
                the button asks for the next hundred. */}
            <button
              disabled={isLoadingNext}
              onClick={() => {
                loadNext(STANDARDS_PAGE_SIZE);
              }}
              type="button"
            >
              {isLoadingNext ? "Loading more…" : "Load more"}
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default StandardsIndex;
