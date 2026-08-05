import { useHead } from "@canonical/react-head";
import { Link } from "@canonical/router-react";
import type React from "react";
import { Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import ErrorBoundary from "#lib/ErrorBoundary/index.js";
import type { StandardEntityQuery } from "#relay/__generated__/StandardEntityQuery.graphql.js";
import standardEntityQueryNode from "#relay/__generated__/StandardEntityQuery.graphql.js";
import { StandardArticle } from "../StandardArticle/index.js";
import { standardEntityVariables } from "../standardEntityQuery.js";
import type { StandardReadingPageProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `StandardEntityQuery` — relay-compiler reads
 * this tag to (re)generate the artifact imported above; the hook consumes
 * the generated node because this module sits on the server bricks' native
 * import chain (routes → here), where an evaluated tag throws at module
 * scope. Never invoked. `uri`/`_meta.{curie,title,type}` ride at the root
 * selection beside the masked fragment spread: the page itself needs them
 * for the head title, the not-found line and the class guard, and fragment
 * data is invisible to it by design.
 *
 * `boundClass` IS LOAD-BEARING, NOT DECORATION. `codeStandard(uri:)`
 * returned null for anything that was not a standard, and the route leaned
 * on that. `node(id:)` returns ANY node, so without a guard
 * `/standards/<a component IRI>` would render a standards page for a
 * component. The comparison below is between two absolute IRIs BOTH
 * produced by the same server — no client-side prefix logic, so nothing
 * can drift.
 */
const standardEntityQuerySource = (): unknown => graphql`
  query StandardEntityQuery($uri: ID!, $classUri: String!) {
    boundClass: ontologyClass(uri: $classUri) {
      uri
      subclasses {
        uri
      }
    }
    node(id: $uri) {
      uri
      _meta {
        curie
        title
        type {
          uri
        }
      }
      ...StandardArticle_standard
    }
  }
`;
void standardEntityQuerySource;

const componentCssClassName = "ds standard-reading";

/**
 * The data-bearing interior: ONE `useLazyLoadQuery` per page (the P-2/P-5
 * register), the article fragment fans out below. A node that is absent —
 * or that is not a standard — renders the in-canvas not-found branch, the
 * R4 precedent: unknown URIs are a 200 with an honest alert, never an HTTP
 * 404, because the URI space is the graph's, not the router's.
 *
 * ONE LEVEL of `subclasses` is admitted, matching what `instances` already
 * returns on both known providers (metro's `Stop` counts Stations AND
 * Interchanges). A deeper hierarchy would need transitivity, and saying so
 * here is better than pretending the guard already has it.
 */
const ReadingContent = ({
  uri,
}: {
  readonly uri: string;
}): React.ReactElement => {
  const data = useLazyLoadQuery<StandardEntityQuery>(
    standardEntityQueryNode,
    standardEntityVariables({ uri }),
  );
  const bound = data.boundClass;
  const node = data.node;
  const permitted = new Set(
    bound === null || bound === undefined
      ? []
      : [bound.uri, ...bound.subclasses.map((subclass) => subclass.uri)],
  );
  const standard = node && permitted.has(node._meta.type.uri) ? node : null;
  // Titles are client-only: the head hook writes `document.title` in an
  // effect (this app's SSR path emits no `<title>` — the P-5 register).
  useHead(
    {
      title: `${standard ? standard._meta.title : "Standard not found"} — Pragma docs`,
    },
    [standard],
  );

  if (!standard) {
    return (
      <p role="alert">
        No standard found at <code>{uri}</code>. The standards index lists every
        standard the graph carries.
      </p>
    );
  }

  return <StandardArticle standard={standard} />;
};

/**
 * The standard reading route (`/standards/:uri`, key `standardEntity`) —
 * `layout.reading` per the layouts spec: a measured prose column (the
 * `reading-canvas` slot, `StandardArticle`) under a breadcrumb back to
 * the index. The layout's two optional slots stay honestly empty in v1:
 * no section tree (`reading-nav` — one standard is one short document,
 * nothing to outline) and no on-this-page aside (`reading-aside` — the
 * spec summons it for long docs only). The breadcrumb and the `data-view`
 * marker live OUTSIDE the suspending interior so route content never
 * suspends at Outlet level (the PlaygroundPage precedent). `params.uri`
 * arrives percent-decoded from the router codec.
 */
const StandardReadingPage = ({
  className,
  params,
}: StandardReadingPageProps): React.ReactElement => {
  const uri = String(params.uri);

  return (
    <section
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-view="standard-reading"
    >
      <nav aria-label="Breadcrumb" className="standard-reading-breadcrumb">
        <Link to="standards">Standards</Link>
      </nav>
      <ErrorBoundary
        fallback={
          <p role="alert">
            The graph query failed. Is the dev backend up? Reload to retry.
          </p>
        }
      >
        <Suspense fallback={<p>Loading the standard…</p>}>
          <ReadingContent uri={uri} />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
};

export default StandardReadingPage;
