import { Link } from "@canonical/router-react";
import type React from "react";
import { useState } from "react";
import { graphql, useFragment } from "react-relay";
import type { TermRail_ontologies$key } from "#relay/__generated__/TermRail_ontologies.graphql.js";
import termRailFragmentNode from "#relay/__generated__/TermRail_ontologies.graphql.js";
import { toPrefixedUri } from "../uris.js";
import type { TermRailProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `TermRail_ontologies` (see the components
 * lens's `EntityHeader` for the native-import rationale: this module rides
 * the server bricks' native import chain, where an evaluated tag throws at
 * module scope). Never invoked.
 */
const termRailFragmentSource = (): unknown => graphql`
  fragment TermRail_ontologies on Ontology @relay(plural: true) {
    prefix
    label
    namespace
    classes {
      uri
      label
      isAbstract
      instanceCount
    }
    properties {
      uri
      label
      kind
    }
  }
`;
void termRailFragmentSource;

const componentCssClassName = "ds term-rail";

/** One rail item's display name: the graph label, else the prefixed URI. */
const termLabel = (
  label: string | null | undefined,
  prefixed: string,
): string => label ?? prefixed;

/** Case-insensitive substring match over a term's label and prefixed URI. */
const matchesFilter = (
  filter: string,
  label: string | null | undefined,
  prefixed: string,
): boolean =>
  filter.length === 0 ||
  termLabel(label, prefixed).toLowerCase().includes(filter) ||
  prefixed.toLowerCase().includes(filter);

/**
 * The explorer's west rail: every term the ontologies carry, grouped per
 * ontology into Classes and Properties, each item a term link. This rail
 * is the COMPLETE keyboard path through the explorer: it lists every term
 * the hierarchy well draws (and every property besides), so the graph
 * canvas never has to be traversed to reach anything — the well is a
 * spatial view over the same nouns, not the only path (WCAG 2.1.3).
 *
 * Selection needs no wiring here: the router's `Link` stamps
 * `aria-current="page"` on the item whose address is the current URL, and
 * hovering any item prefetches its term through the route's warm-up seam.
 *
 * The text filter is EPHEMERAL view state (the P-D7 transient tier):
 * component state only, never the URL — a filtered rail is a way of
 * looking, not a place to link to.
 */
const TermRail = ({
  className,
  ontologies,
}: TermRailProps): React.ReactElement => {
  const data = useFragment<TermRail_ontologies$key>(
    termRailFragmentNode,
    ontologies,
  );
  const [filter, setFilter] = useState("");
  const normalizedFilter = filter.trim().toLowerCase();

  return (
    <nav
      aria-label="Ontology terms"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-slot="explorer-rail"
    >
      <p className="term-rail-filter">
        <label>
          Filter terms
          <input
            onChange={(event) => {
              setFilter(event.target.value);
            }}
            type="search"
            value={filter}
          />
        </label>
      </p>
      {data.map((ontology) => {
        const namespaces = [ontology];
        const classes = ontology.classes.filter((term) =>
          matchesFilter(
            normalizedFilter,
            term.label,
            toPrefixedUri(term.uri, namespaces),
          ),
        );
        const properties = ontology.properties.filter((term) =>
          matchesFilter(
            normalizedFilter,
            term.label,
            toPrefixedUri(term.uri, namespaces),
          ),
        );
        const headingId = `term-rail-${ontology.prefix}`;

        return (
          <section aria-labelledby={headingId} key={ontology.prefix}>
            <h2 id={headingId}>{ontology.label ?? ontology.prefix}</h2>
            <h3>Classes</h3>
            {classes.length === 0 ? (
              <p className="term-rail-empty">No matching classes.</p>
            ) : (
              <ul>
                {classes.map((term) => {
                  const prefixed = toPrefixedUri(term.uri, namespaces);
                  return (
                    <li key={term.uri}>
                      <Link params={{ term: prefixed }} to="definitionsTerm">
                        {termLabel(term.label, prefixed)}
                      </Link>
                      {term.isAbstract ? (
                        <span className="term-rail-note">abstract</span>
                      ) : null}
                      {term.instanceCount > 0 ? (
                        <span className="term-rail-note">
                          {term.instanceCount}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <h3>Properties</h3>
            {properties.length === 0 ? (
              <p className="term-rail-empty">No matching properties.</p>
            ) : (
              <ul>
                {properties.map((term) => {
                  const prefixed = toPrefixedUri(term.uri, namespaces);
                  return (
                    <li key={term.uri}>
                      <Link params={{ term: prefixed }} to="definitionsTerm">
                        {termLabel(term.label, prefixed)}
                      </Link>
                      <span className="term-rail-note">
                        {term.kind.toLowerCase()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </nav>
  );
};

export default TermRail;
