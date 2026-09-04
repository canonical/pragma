import type React from "react";
import { graphql, useFragment } from "react-relay";
import type { EntityHeader_component$key } from "#relay/__generated__/EntityHeader_component.graphql.js";
import entityHeaderFragmentNode from "#relay/__generated__/EntityHeader_component.graphql.js";
import type { EntityHeaderProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `EntityHeader_component` — relay-compiler
 * reads this tag to (re)generate the artifact imported above. The hook uses
 * the GENERATED node because this module sits on the server bricks' native
 * import chain (routes → ComponentEntityPage → here), where no Vite
 * transform rewrites tags and an evaluated tag throws at module scope. The
 * wrapper arrow is never invoked; deleting it would make the next
 * `bun run relay` prune the artifact.
 */
const entityHeaderFragmentSource = (): unknown => graphql`
  fragment EntityHeader_component on Component {
    uri
    _meta {
      curie
    }
    name
    summary
    tier {
      uri
      name
      _meta {
        curie
      }
    }
  }
`;
void entityHeaderFragmentSource;

const componentCssClassName = "ds entity-header";

/**
 * The component entity's identity block: name as the page's h1, the
 * COMPACT URI as a code line, its tier, and the summary paragraph.
 * Schema-nullable text falls back `name ?? _meta.curie` (zero null tiers
 * live, but the schema allows them — same posture as `ComponentProbe`).
 *
 * `uri` is the absolute IRI (ruling R-2) and stays the identity Relay keys
 * on; `_meta.curie` is the graph's own compact rendering of it, so no
 * namespace table is reconstructed app-side.
 */
const EntityHeader = ({
  className,
  component,
}: EntityHeaderProps): React.ReactElement => {
  const data = useFragment<EntityHeader_component$key>(
    entityHeaderFragmentNode,
    component,
  );

  return (
    <header
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <h1 id="component-entity-title">{data.name ?? data._meta.curie}</h1>
      <p className="entity-header-meta">
        <code>{data._meta.curie}</code>
        {data.tier ? (
          <span className="entity-header-tier">
            tier: {data.tier.name ?? data.tier._meta.curie}
          </span>
        ) : null}
      </p>
      {data.summary ? (
        <p className="entity-header-summary">{data.summary}</p>
      ) : (
        <p className="entity-header-summary">No summary recorded.</p>
      )}
    </header>
  );
};

export default EntityHeader;
