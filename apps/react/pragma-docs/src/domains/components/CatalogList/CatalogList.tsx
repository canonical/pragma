import type React from "react";
import { graphql, usePaginationFragment } from "react-relay";
import type { CatalogList_query$key } from "#relay/__generated__/CatalogList_query.graphql.js";
import catalogListFragmentNode from "#relay/__generated__/CatalogList_query.graphql.js";
import type { CatalogListPaginationQuery } from "#relay/__generated__/CatalogListPaginationQuery.graphql.js";
import { CatalogItem } from "../CatalogItem/index.js";
import { CATALOG_PAGE_SIZE } from "../catalogQuery.js";
import type { CatalogListProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `CatalogList_query` (see `EntityHeader` for
 * the native-import rationale). The `@connection` key + `@refetchable`
 * generate `CatalogListPaginationQuery` for `loadNext`. Never invoked.
 */
const catalogListFragmentSource = (): unknown => graphql`
  fragment CatalogList_query on Query
  @argumentDefinitions(
    count: { type: "Int!" }
    cursor: { type: "String" }
  )
  @refetchable(queryName: "CatalogListPaginationQuery") {
    components(first: $count, after: $cursor)
      @connection(key: "CatalogList_components") {
      edges {
        node {
          id
          tier {
            name
          }
          ...CatalogItem_component
        }
      }
    }
  }
`;
void catalogListFragmentSource;

const componentCssClassName = "ds catalog-list";

/** The tier bucket for components whose graph tier is absent — the schema
 * allows a null tier even though the live graph currently has none. */
const UNTIERED = "Untiered";

/** Anchor id for a tier's section (the jump-link targets). */
const tierAnchorId = (tierName: string): string =>
  `catalog-tier-${tierName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;

/**
 * Tier order, ruling R7: Global first, the rest alphabetical, Untiered
 * last.
 */
const compareTiers = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a === "Global") return -1;
  if (b === "Global") return 1;
  if (a === UNTIERED) return 1;
  if (b === UNTIERED) return -1;
  return a.localeCompare(b, "en");
};

/**
 * The catalog's composed layout: tier jump-links west (the mode's
 * secondary nav), tier-grouped card grid east. Pagination is Relay's
 * connection machinery over the schema's hard 100-item page cap
 * (ke-graphql MAX_PAGE_SIZE — not configurable), surfaced as an explicit
 * "Load more" button rather than an invisible truncation (ruling R1);
 * cursors are opaque server state, never derived client-side.
 */
const CatalogList = ({
  className,
  query,
}: CatalogListProps): React.ReactElement => {
  const { data, hasNext, isLoadingNext, loadNext } = usePaginationFragment<
    CatalogListPaginationQuery,
    CatalogList_query$key
  >(catalogListFragmentNode, query);

  const edges = data.components.edges;
  const groups = new Map<string, (typeof edges)[number]["node"][]>();
  for (const { node } of edges) {
    const tierName = node.tier?.name ?? UNTIERED;
    const bucket = groups.get(tierName) ?? [];
    bucket.push(node);
    groups.set(tierName, bucket);
  }
  const tierNames = [...groups.keys()].sort(compareTiers);

  return (
    <div
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <nav aria-label="Tiers" data-region="secondary-nav">
        <ul className="catalog-tier-links">
          {tierNames.map((tierName) => (
            <li key={tierName}>
              <a href={`#${tierAnchorId(tierName)}`}>{tierName}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="catalog-groups" data-region="canvas">
        {tierNames.map((tierName) => (
          <section
            aria-labelledby={`${tierAnchorId(tierName)}-title`}
            id={tierAnchorId(tierName)}
            key={tierName}
          >
            <h3 id={`${tierAnchorId(tierName)}-title`}>{tierName}</h3>
            <ul className="catalog-cards">
              {(groups.get(tierName) ?? []).map((node) => (
                <CatalogItem component={node} key={node.id} />
              ))}
            </ul>
          </section>
        ))}
        {hasNext ? (
          <p className="catalog-more">
            {/* The cap is the server's (R1): the page holds the first 100;
                the button asks for the next hundred. */}
            <button
              disabled={isLoadingNext}
              onClick={() => {
                loadNext(CATALOG_PAGE_SIZE);
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

export default CatalogList;
