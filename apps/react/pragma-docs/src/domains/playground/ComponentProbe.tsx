import type { ReactElement } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { ComponentProbeQuery } from "#relay/__generated__/ComponentProbeQuery.graphql.js";

/** How many related entities each connection lists in the probe. */
const RELATION_PAGE_SIZE = 12;

const componentProbeQuery = graphql`
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

export interface ComponentProbeProps {
  /** The prefixed URI of the component to render (e.g. `ds:global.component.button`). */
  readonly uri: string;
}

/**
 * Renders one component entity straight off the graph: identity, tier, and
 * its subcomponent/modifier-family neighborhoods.
 *
 * The hook suspends while the query is in flight, so render this inside a
 * `Suspense` boundary — and, until the P-2 SSR data-hydration track lands,
 * only on the client (see `PlaygroundPage`).
 */
export default function ComponentProbe({
  uri,
}: ComponentProbeProps): ReactElement {
  const data = useLazyLoadQuery<ComponentProbeQuery>(componentProbeQuery, {
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
