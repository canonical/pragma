import { useTranslation } from "@canonical/i18n-react";
import type { ReactElement } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { ProductListQuery } from "#relay/__generated__/ProductListQuery.graphql.js";
import ProductCard from "./ProductCard.js";

/** How many products the list requests from the connection. */
const PAGE_SIZE = 4;

const productListQuery = graphql`
  query ProductListQuery($count: Int!, $cursor: String) {
    viewer {
      name
      products(first: $count, after: $cursor) {
        totalCount
        pageInfo {
          hasNextPage
        }
        edges {
          node {
            id
            ...ProductCard_product
          }
        }
      }
    }
  }
`;

/**
 * Fetches the first page of the product catalog with `useLazyLoadQuery` and
 * renders a `ProductCard` (a `useFragment` child) per edge.
 *
 * The hook suspends while the query is in flight, so render this component
 * inside a `Suspense` boundary — and, until the SSR data-serialization PR
 * lands, only on the client (see `CatalogPage`).
 */
export default function ProductList(): ReactElement {
  const { t } = useTranslation();
  const data = useLazyLoadQuery<ProductListQuery>(productListQuery, {
    count: PAGE_SIZE,
  });
  const { products } = data.viewer;

  return (
    <section aria-label={t("catalog.listLabel")}>
      <p>
        {/*
          `catalog.showing` is a plural entry: `count` (the total) selects the
          CLDR category via Intl.PluralRules — English has one/other, Arabic
          all six. The viewer name stays a separate element so it can carry
          emphasis, which a plain message string cannot.
        */}
        {t("catalog.signedInAs")} <strong>{data.viewer.name}</strong>{" "}
        {t("catalog.showing", {
          shown: products.edges.length,
          count: products.totalCount,
        })}
      </p>
      <ul>
        {products.edges.map(({ node }) => (
          <li key={node.id}>
            <ProductCard product={node} />
          </li>
        ))}
      </ul>
      {products.pageInfo.hasNextPage && <p>{t("catalog.more")}</p>}
    </section>
  );
}
