import { useHead } from "@canonical/react-head";
import type React from "react";
import { Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import ErrorBoundary from "#lib/ErrorBoundary/index.js";
import type { ComponentsCatalogQuery } from "#relay/__generated__/ComponentsCatalogQuery.graphql.js";
import componentsCatalogQueryNode from "#relay/__generated__/ComponentsCatalogQuery.graphql.js";
import { CatalogList } from "../CatalogList/index.js";
import { CATALOG_PAGE_SIZE } from "../catalogQuery.js";
import type { ComponentsCatalogPageProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `ComponentsCatalogQuery` — the whole page is
 * one operation: the pagination fragment's first page rides the root query
 * (see `EntityHeader` for the native-import rationale). Never invoked.
 */
const componentsCatalogQuerySource = (): unknown => graphql`
  query ComponentsCatalogQuery($count: Int!, $cursor: String) {
    ...CatalogList_query @arguments(count: $count, cursor: $cursor)
  }
`;
void componentsCatalogQuerySource;

const componentCssClassName = "ds components-catalog";

/**
 * The data-bearing interior: ONE `useLazyLoadQuery` per page; the
 * pagination fragment fans out from the query root.
 */
const CatalogContent = (): React.ReactElement => {
  const data = useLazyLoadQuery<ComponentsCatalogQuery>(
    componentsCatalogQueryNode,
    { count: CATALOG_PAGE_SIZE, cursor: null },
  );

  return <CatalogList query={data} />;
};

/**
 * The components catalog route (`/components`, key `components` — the key
 * the Rail links to). The h1 marker stays OUTSIDE the boundaries (the
 * frame suite keys the catalog canvas off `lens-components-title`), and
 * route content never suspends at Outlet level — suspension there would
 * swap the whole Shell (the PlaygroundPage precedent). No filters in v1
 * (ruling R2): the composed layout is jump-links + grouped grid only.
 */
const ComponentsCatalogPage = ({
  className,
}: ComponentsCatalogPageProps): React.ReactElement => {
  useHead({ title: "Components — Pragma docs" });

  return (
    <section
      aria-labelledby="lens-components-title"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <h1 id="lens-components-title">Components</h1>
      <ErrorBoundary
        fallback={
          <p role="alert">
            The graph query failed. Is the dev backend up? Reload to retry.
          </p>
        }
      >
        <Suspense fallback={<p>Loading the catalog…</p>}>
          <CatalogContent />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
};

export default ComponentsCatalogPage;
