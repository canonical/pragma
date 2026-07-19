import type React from "react";
import { graphql, useFragment } from "react-relay";
import type { RelationsSection_component$key } from "#relay/__generated__/RelationsSection_component.graphql.js";
import relationsSectionFragmentNode from "#relay/__generated__/RelationsSection_component.graphql.js";
import type { RelationsSectionProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `RelationsSection_component` (see
 * `EntityHeader` for the native-import rationale). `count` is a fragment
 * argument so the one query variable feeds both connections. Never invoked.
 */
const relationsSectionFragmentSource = (): unknown => graphql`
  fragment RelationsSection_component on Component
  @argumentDefinitions(count: { type: "Int!" }) {
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
          uri
          name
        }
      }
    }
  }
`;
void relationsSectionFragmentSource;

const componentCssClassName = "ds relations-section";

/**
 * The entity's graph neighborhood: subcomponents and modifier families as
 * two plain lists (name + URI in code voice). Deliberately NOT chips —
 * subcomponents are not a registered Chip kind (ruling R5); linking waits
 * for the D31 landing map. Empty states say "None." so absence reads as a
 * fact, not a loading state.
 */
const RelationsSection = ({
  className,
  component,
}: RelationsSectionProps): React.ReactElement => {
  const data = useFragment<RelationsSection_component$key>(
    relationsSectionFragmentNode,
    component,
  );

  return (
    <section
      aria-labelledby="component-entity-relations"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <h2 id="component-entity-relations">Relations</h2>
      <h3>Subcomponents</h3>
      {data.subcomponents.edges.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul>
          {data.subcomponents.edges.map(({ node }) => (
            <li key={node.id}>
              {node.name ?? node.uri} <code>{node.uri}</code>
            </li>
          ))}
        </ul>
      )}
      <h3>Modifier families</h3>
      {data.modifierFamilies.edges.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul>
          {data.modifierFamilies.edges.map(({ node }) => (
            <li key={node.id}>
              {node.name ?? node.uri} <code>{node.uri}</code>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RelationsSection;
