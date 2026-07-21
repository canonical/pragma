import { Link } from "@canonical/router-react";
import type React from "react";
import { graphql, useFragment } from "react-relay";
import type { TermRail_ontologies$key } from "#relay/__generated__/TermRail_ontologies.graphql.js";
import termRailFragmentNode from "#relay/__generated__/TermRail_ontologies.graphql.js";
import { matchesChips, matchesText } from "../lensFilter.js";
import { toPrefixedUri } from "../uris.js";
import type { TermRailProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `TermRail_ontologies` (see the components
 * lens's `EntityHeader` for the native-import rationale: this module rides
 * the server bricks' native import chain, where an evaluated tag throws at
 * module scope). Never invoked.
 *
 * The rail does NOT declare `superclass` here on purpose: adding it would
 * re-emit the shared operation's query text and break the relay-byte
 * identity contract (verified — Relay writes fragment selections into the
 * wire text, so the field is not free even though the well already fetches
 * it). Depth therefore arrives as a prop the explorer derives from the
 * well's fragment; see `depthByUri` in the props and `DefinitionsExplorer`.
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

/**
 * The depth glyph: the exhibit's monospace `·` run, one dot per superclass
 * hop. A root (depth 0) shows an empty cell rather than nothing, so every
 * item's label starts at the same inline offset within its depth and the
 * glyph column stays a column. Purely decorative — the indent (a
 * `data-depth` hook the stylesheet reads) carries the same information
 * spatially, and the accessible name never includes it.
 */
const depthGlyph = (depth: number): string => "·".repeat(depth);

/** Depth capped for the INDENT only — a pathological chain must never push
 * a label off the rail. The glyph still shows the true count. */
const MAX_INDENT_DEPTH = 6;

/**
 * The explorer's west rail: every term the ontologies carry, grouped per
 * ontology into Classes and Properties, each item a term link. This rail
 * is the COMPLETE keyboard path through the explorer: it lists every term
 * the hierarchy well draws (and every property besides), so the graph
 * canvas never has to be traversed to reach anything — the well is a
 * spatial view over the same nouns, not the only path (WCAG 2.1.3).
 *
 * A REAL INDEX, to the exhibit's bar and past it. Each class item carries
 * the two REAL axes the ontology actually has — no invented status:
 *
 * - An ABSTRACTION marker (`data-abstraction`): a small glyph that restates
 *   exactly what the graph encodes with a dashed border and an ABSTRACT
 *   tag. The ontology carries `isAbstract` and `namespace` and NOTHING
 *   resembling a lifecycle/status/channel on a class (verified live —
 *   R7's lesson), so this rail marks abstractness and provenance and
 *   refuses to fake a status dot the data cannot back.
 * - A DEPTH indicator: the superclass depth (`depthByUri`, the same measure
 *   the well stacks its layers by) as the exhibit's monospace dot-run AND
 *   as a real indent, so the class tree's shape is legible in the flat list.
 *
 * THE ASYMMETRY (the exhibit's central heuristic, and our TTL contract's
 * demand): the rail DIMS, it never HIDES. Every term stays mounted in
 * document order under every filter, marked `data-dimmed` when it falls
 * out — so the index stays complete and stable, items never jump under the
 * cursor, and the number of things that exist never appears to change.
 * Only the graph hides (see `HierarchyWell`).
 *
 * Dimmed items take `aria-disabled` so assistive tech hears the state the
 * opacity shows, and each heading reports its own match count, so a filter
 * that dims everything still says so in words rather than by silence.
 *
 * Both filter axes reach this rail: the text query (rail-only by
 * contract — it never re-shapes the graph) and the chips (which govern
 * both). All of it is EPHEMERAL view state owned by `DefinitionsExplorer`
 * (the P-D7 transient tier), never the URL — a filtered rail is a way of
 * looking, not a place to link to.
 *
 * Selection needs no wiring here: the router's `Link` stamps
 * `aria-current="page"` on the item whose address is the current URL, and
 * hovering any item prefetches its term through the route's warm-up seam.
 */
const TermRail = ({
  className,
  filter,
  ontologies,
  depthByUri,
}: TermRailProps): React.ReactElement => {
  const data = useFragment<TermRail_ontologies$key>(
    termRailFragmentNode,
    ontologies,
  );

  return (
    <nav
      aria-label="Ontology terms"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-slot="explorer-rail"
    >
      {data.map((ontology) => {
        const namespaces = [ontology];

        // Every term is rendered; `dimmed` decides only how it LOOKS.
        // Classes answer to both axes; properties answer to the text axis
        // and their ontology's namespace chip (a property has no
        // abstraction of its own, so the abstraction chips leave it be).
        const classes = ontology.classes.map((term) => {
          const prefixed = toPrefixedUri(term.uri, namespaces);
          return {
            term,
            prefixed,
            depth: depthByUri.get(term.uri) ?? 0,
            dimmed:
              !matchesText(filter.text, term.label, prefixed) ||
              !matchesChips(filter, term.isAbstract, ontology.prefix),
          };
        });
        const properties = ontology.properties.map((term) => {
          const prefixed = toPrefixedUri(term.uri, namespaces);
          return {
            term,
            prefixed,
            dimmed:
              !matchesText(filter.text, term.label, prefixed) ||
              !filter.namespaces.includes(ontology.prefix),
          };
        });

        const classMatches = classes.filter((row) => !row.dimmed).length;
        const propertyMatches = properties.filter((row) => !row.dimmed).length;
        const headingId = `term-rail-${ontology.prefix}`;

        return (
          <section aria-labelledby={headingId} key={ontology.prefix}>
            <h2 id={headingId}>{ontology.label ?? ontology.prefix}</h2>
            <h3>
              Classes
              <span className="term-rail-count">
                {classMatches} of {classes.length}
              </span>
            </h3>
            <ul>
              {classes.map(({ term, prefixed, depth, dimmed }) => (
                <li
                  aria-disabled={dimmed || undefined}
                  data-abstraction={term.isAbstract ? "abstract" : "concrete"}
                  data-depth={Math.min(depth, MAX_INDENT_DEPTH)}
                  data-dimmed={dimmed || undefined}
                  key={term.uri}
                >
                  {/* The abstraction marker: the SAME distinction the graph
                      draws (dashed vs solid), restated here so the rail is
                      honest about the one real per-class axis. Decorative —
                      aria-hidden — because the "abstract" word below carries
                      it to assistive tech. */}
                  <span aria-hidden="true" className="term-rail-mark" />
                  <span aria-hidden="true" className="term-rail-depth">
                    {depthGlyph(depth)}
                  </span>
                  <Link params={{ term: prefixed }} to="definitionsTerm">
                    {termLabel(term.label, prefixed)}
                  </Link>
                  {term.isAbstract ? (
                    <span className="term-rail-note">abstract</span>
                  ) : null}
                  {term.instanceCount > 0 ? (
                    <span className="term-rail-note">{term.instanceCount}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <h3>
              Properties
              <span className="term-rail-count">
                {propertyMatches} of {properties.length}
              </span>
            </h3>
            <ul>
              {properties.map(({ term, prefixed, dimmed }) => (
                <li
                  aria-disabled={dimmed || undefined}
                  data-dimmed={dimmed || undefined}
                  key={term.uri}
                >
                  <Link params={{ term: prefixed }} to="definitionsTerm">
                    {termLabel(term.label, prefixed)}
                  </Link>
                  <span className="term-rail-note">
                    {term.kind.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
};

export default TermRail;
