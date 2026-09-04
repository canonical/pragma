import type { TermRail_ontologies$key } from "#relay/__generated__/TermRail_ontologies.graphql.js";
import type { LensFilter } from "../lensFilter.js";

export interface TermRailProps {
  /** Additional CSS class names. */
  className?: string;
  /**
   * The lens's ephemeral filter, owned by `DefinitionsExplorer` so the
   * rail, the well and the strip's controls all read one value. The rail
   * only ever DIMS on it — it never removes an item (see the component).
   */
  readonly filter: LensFilter;
  /** Plural fragment ref over the query root's `ontologies` list. */
  readonly ontologies: TermRail_ontologies$key;
  /**
   * Superclass depth per class, keyed by FULL IRI — the same measure the
   * well stacks its layers by (`classDepthsByUri`), computed once by
   * `DefinitionsExplorer` and passed down. The rail's own fragment cannot
   * carry `superclass` without changing the shared operation's query text
   * (the relay-byte-identity contract), so depth arrives as data rather
   * than as a fragment field. A URI absent from the map reads as depth 0.
   */
  readonly depthByUri: ReadonlyMap<string, number>;
  /**
   * The transient hover/focus centre — the shared ego centre this lens
   * lifts into `DefinitionsExplorer` (P-D7). CLIENT-ONLY: `undefined` on
   * the server and on the first client paint, so the rail's initial markup
   * matches the server's byte for byte. When it names a rail term, that
   * item takes `is-hovered` (distinct from `.active`/`aria-current`
   * selection). The prefixed term address, matching the item's own id.
   */
  readonly hoverCentre: string | undefined;
  /**
   * Raise (or clear) a term as the shared ego centre — the rail's half of
   * the bidirectional hover. Called on pointer-enter/leave and keyboard
   * focus/blur of an item; the well reads the same centre and fades to its
   * 1-hop neighbourhood, exactly as a graph-node hover does.
   */
  readonly onHoverTerm: (term: string | undefined) => void;
}
