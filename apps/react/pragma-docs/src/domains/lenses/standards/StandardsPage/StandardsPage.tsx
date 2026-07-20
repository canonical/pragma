import { useHead } from "@canonical/react-head";
import type React from "react";
import { Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import ErrorBoundary from "#lib/ErrorBoundary/index.js";
import type { StandardsIndexQuery } from "#relay/__generated__/StandardsIndexQuery.graphql.js";
import standardsIndexQueryNode from "#relay/__generated__/StandardsIndexQuery.graphql.js";
import { StandardsIndex } from "../StandardsIndex/index.js";
import { STANDARDS_PAGE_SIZE } from "../standardsIndexQuery.js";
import type { StandardsPageProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `StandardsIndexQuery` — the whole page is
 * one operation: the pagination fragment's first page rides the root
 * query (see `EntityHeader` for the native-import rationale). Never
 * invoked.
 */
const standardsIndexQuerySource = (): unknown => graphql`
  query StandardsIndexQuery($count: Int!, $cursor: String) {
    ...StandardsIndex_query @arguments(count: $count, cursor: $cursor)
  }
`;
void standardsIndexQuerySource;

const componentCssClassName = "ds standards-page";

/**
 * The data-bearing interior: ONE `useLazyLoadQuery` per page; the
 * pagination fragment fans out from the query root.
 */
const IndexContent = (): React.ReactElement => {
  const data = useLazyLoadQuery<StandardsIndexQuery>(standardsIndexQueryNode, {
    count: STANDARDS_PAGE_SIZE,
    cursor: null,
  });

  return <StandardsIndex query={data} />;
};

/**
 * The standards index route (`/standards`, key `standards` — the key the
 * Rail links to). The h1 marker stays OUTSIDE the boundaries (the frame
 * suite keys the standards canvas off `lens-standards-title`), and route
 * content never suspends at Outlet level — suspension there would swap
 * the whole Shell for the fallback (the PlaygroundPage precedent). No
 * filters in v1 (the catalog's R2 posture): the composed layout is
 * category jump-links + grouped lists only.
 */
const StandardsPage = ({
  className,
}: StandardsPageProps): React.ReactElement => {
  useHead({ title: "Standards — Pragma docs" });

  return (
    <section
      aria-labelledby="lens-standards-title"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <h1 id="lens-standards-title">Standards</h1>
      <ErrorBoundary
        fallback={
          <p role="alert">
            The graph query failed. Is the dev backend up? Reload to retry.
          </p>
        }
      >
        <Suspense fallback={<p>Loading the standards…</p>}>
          <IndexContent />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
};

export default StandardsPage;
