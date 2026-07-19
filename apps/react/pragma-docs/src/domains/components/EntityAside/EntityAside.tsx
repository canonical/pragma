import type React from "react";
import { graphql, useFragment } from "react-relay";
import type { EntityAside_component$key } from "#relay/__generated__/EntityAside_component.graphql.js";
import entityAsideFragmentNode from "#relay/__generated__/EntityAside_component.graphql.js";
import type { EntityAsideProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `EntityAside_component` (see `EntityHeader`
 * for the native-import rationale). Never invoked.
 */
const entityAsideFragmentSource = (): unknown => graphql`
  fragment EntityAside_component on Component {
    uri
    version
    tier {
      id
      name
    }
  }
`;
void entityAsideFragmentSource;

const componentCssClassName = "ds entity-aside";

/**
 * The entity view's east rail: a quick-facts list (URI, version, tier).
 * The smallest honest tenant of the frame's `--aside-w` column — it exists
 * so the token is CONSUMED by a real region (AX.6: regions consume the
 * frame tokens, never re-define them); richer facts arrive with later
 * P-5 passes.
 */
const EntityAside = ({
  className,
  component,
}: EntityAsideProps): React.ReactElement => {
  const data = useFragment<EntityAside_component$key>(
    entityAsideFragmentNode,
    component,
  );

  return (
    <aside
      aria-label="Quick facts"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-region="aside"
    >
      <h2>Quick facts</h2>
      <dl>
        <dt>URI</dt>
        <dd>
          <code>{data.uri}</code>
        </dd>
        <dt>Version</dt>
        <dd>{data.version ?? "unversioned"}</dd>
        <dt>Tier</dt>
        <dd>{data.tier ? (data.tier.name ?? data.tier.id) : "Untiered"}</dd>
      </dl>
    </aside>
  );
};

export default EntityAside;
