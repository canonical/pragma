import { useHead } from "@canonical/react-head";
import type React from "react";
import { Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import ErrorBoundary from "#lib/ErrorBoundary/index.js";
import type { ComponentEntityQuery } from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import componentEntityQueryNode from "#relay/__generated__/ComponentEntityQuery.graphql.js";
import { EntityAside } from "../EntityAside/index.js";
import { EntityHeader } from "../EntityHeader/index.js";
import { RELATION_PAGE_SIZE } from "../entityQuery.js";
import { PropertiesSection } from "../PropertiesSection/index.js";
import { RelationsSection } from "../RelationsSection/index.js";
import type { ComponentEntityPageProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `ComponentEntityQuery` — relay-compiler reads
 * this tag to (re)generate the artifact imported above; the hook consumes
 * the generated node because this module sits on the server bricks' native
 * import chain (routes → here), where an evaluated tag throws at module
 * scope. Never invoked. `name`/`uri` ride at the root selection beside the
 * masked fragment spreads: the page itself needs them for the head title
 * and the not-found line, and fragment data is invisible to it by design.
 */
const componentEntityQuerySource = (): unknown => graphql`
  query ComponentEntityQuery($uri: String!, $count: Int!) {
    component(uri: $uri) {
      id
      name
      uri
      ...EntityHeader_component
      ...PropertiesSection_component
      ...RelationsSection_component @arguments(count: $count)
      ...EntityAside_component
    }
  }
`;
void componentEntityQuerySource;

const componentCssClassName = "ds component-entity";

/**
 * The data-bearing interior: ONE `useLazyLoadQuery` per page (the P-2/P-5
 * register), fragments fan out to the section components. A null
 * `component` renders the in-canvas not-found branch — ruling R4: unknown
 * URIs are a 200 with an honest alert, never an HTTP 404, because the URI
 * space is the graph's, not the router's.
 */
const EntityContent = ({
  uri,
}: {
  readonly uri: string;
}): React.ReactElement => {
  const data = useLazyLoadQuery<ComponentEntityQuery>(
    componentEntityQueryNode,
    {
      uri,
      count: RELATION_PAGE_SIZE,
    },
  );
  const component = data.component;
  // Titles are client-only: the head hook writes `document.title` in an
  // effect. This app's SSR path emits no `<title>` (EntryServer mounts
  // HeadProvider without a collector), so nothing here rides an
  // SSR-escaping path (P-5 Relay/SSR review).
  useHead(
    {
      title: `${component ? (component.name ?? component.uri) : "Component not found"} — Pragma docs`,
    },
    [component],
  );

  if (!component) {
    return (
      <p role="alert">
        No component found at <code>{uri}</code>. The catalog lists every
        component the graph carries.
      </p>
    );
  }

  return (
    <div className="component-entity-body">
      <article className="component-entity-article">
        <EntityHeader component={component} />
        <PropertiesSection component={component} />
        <RelationsSection component={component} />
      </article>
      <EntityAside component={component} />
    </div>
  );
};

/**
 * The component entity route (`/components/:uri`, key `componentEntity`).
 * The `data-view` marker and the boundaries live OUTSIDE the suspending
 * interior so route content never suspends at Outlet level — suspension
 * there would swap the whole Shell for the fallback (the PlaygroundPage
 * precedent). `params.uri` arrives percent-decoded from the router codec.
 */
const ComponentEntityPage = ({
  className,
  params,
}: ComponentEntityPageProps): React.ReactElement => {
  const uri = String(params.uri);

  return (
    <section
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-view="component-entity"
    >
      <ErrorBoundary
        fallback={
          <p role="alert">
            The graph query failed. Is the dev backend up? Reload to retry.
          </p>
        }
      >
        <Suspense fallback={<p>Loading the component…</p>}>
          <EntityContent uri={uri} />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
};

export default ComponentEntityPage;
