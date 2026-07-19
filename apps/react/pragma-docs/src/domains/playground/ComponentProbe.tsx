import type { ReactElement } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { ComponentProbeQuery } from "#relay/__generated__/ComponentProbeQuery.graphql.js";
import componentProbeQueryNode from "#relay/__generated__/ComponentProbeQuery.graphql.js";
import { RELATION_PAGE_SIZE } from "./probeQuery.js";

/**
 * Codegen source of truth for `ComponentProbeQuery` — relay-compiler reads
 * this tag to (re)generate the artifact imported above. The hook below uses
 * the GENERATED node directly because this module sits on the server bricks'
 * native import chain (routes → PlaygroundPage → here), where no Vite
 * transform rewrites tags and an evaluated tag throws at module scope. The
 * wrapper arrow is never invoked, so the tag is never evaluated at runtime;
 * deleting it would make the next `bun run relay` prune the artifact.
 */
const componentProbeQuerySource = (): unknown => graphql`
  query ComponentProbeQuery($uri: String!, $count: Int!) {
    component(uri: $uri) {
      id
      uri
      name
      summary
      tier {
        id
        name
      }
      subcomponents(first: $count) {
        edges {
          node {
            id
            uri
            name
          }
        }
      }
      modifierFamilies(first: $count) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  }
`;
void componentProbeQuerySource;

export interface ComponentProbeProps {
  /** The prefixed URI of the component to render (e.g. `ds:global.component.button`). */
  readonly uri: string;
}

/**
 * Renders one component entity straight off the graph: identity, tier, and
 * its subcomponent/modifier-family neighborhoods.
 *
 * The hook suspends while the query is in flight, so render this inside a
 * `Suspense` boundary. On the SSR paths the store is seeded by the server's
 * prepare step (same operation, same variables — see `probeQuery.ts`), so the
 * hook renders from the warm store without fetching; on the SPA paths it
 * fetches over HTTP as before.
 */
export default function ComponentProbe({
  uri,
}: ComponentProbeProps): ReactElement {
  const data = useLazyLoadQuery<ComponentProbeQuery>(componentProbeQueryNode, {
    uri,
    count: RELATION_PAGE_SIZE,
  });
  const component = data.component;

  if (!component) {
    return (
      <p role="alert">
        No component found at <code>{uri}</code>.
      </p>
    );
  }

  return (
    <article aria-label={component.name ?? component.uri}>
      <header>
        <h2>{component.name ?? component.uri}</h2>
        <p>
          <code>{component.uri}</code>
          {component.tier?.name ? <> · tier: {component.tier.name}</> : null}
        </p>
      </header>
      {component.summary ? (
        <p>{component.summary}</p>
      ) : (
        <p>No summary recorded.</p>
      )}
      <h3>Subcomponents</h3>
      {component.subcomponents.edges.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul>
          {component.subcomponents.edges.map(({ node }) => (
            <li key={node.id}>
              {node.name ?? node.uri} <code>{node.uri}</code>
            </li>
          ))}
        </ul>
      )}
      <h3>Modifier families</h3>
      {component.modifierFamilies.edges.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul>
          {component.modifierFamilies.edges.map(({ node }) => (
            <li key={node.id}>{node.name ?? node.id}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
