import { Link } from "@canonical/router-react";
import type React from "react";
import { graphql, useFragment } from "react-relay";
import type { CatalogItem_component$key } from "#relay/__generated__/CatalogItem_component.graphql.js";
import catalogItemFragmentNode from "#relay/__generated__/CatalogItem_component.graphql.js";
import type { CatalogItemProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `CatalogItem_component` (see `EntityHeader`
 * for the native-import rationale: this module rides the server bricks'
 * native import chain through the catalog route). Never invoked.
 */
const catalogItemFragmentSource = (): unknown => graphql`
  fragment CatalogItem_component on Component {
    id
    uri
    name
    summary
    tier {
      id
      name
    }
  }
`;
void catalogItemFragmentSource;

const componentCssClassName = "ds catalog-item";

/**
 * One catalog card: the component's name links to its entity page
 * (router-react `Link`, so hover-prefetch warms the store through the
 * route's `warmRouteQuery` hook), with a tier tag and a summary teaser.
 * The `params` round-trip is pinned to `resolveChipHref` by the D31 test
 * in `routeQueries.tests.ts` — cards and chips land on the same address.
 */
const CatalogItem = ({
  className,
  component,
}: CatalogItemProps): React.ReactElement => {
  const data = useFragment<CatalogItem_component$key>(
    catalogItemFragmentNode,
    component,
  );

  return (
    <li
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <h4 className="catalog-item-name">
        <Link params={{ uri: data.uri }} to="componentEntity">
          {data.name ?? data.uri}
        </Link>
      </h4>
      <p className="catalog-item-tier">{data.tier?.name ?? "Untiered"}</p>
      {data.summary ? (
        <p className="catalog-item-summary">{data.summary}</p>
      ) : null}
    </li>
  );
};

export default CatalogItem;
