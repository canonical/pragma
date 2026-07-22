import type React from "react";
import { useMemo, useState } from "react";
import { graphql, useFragment } from "react-relay";
import { Chip } from "#lib/Chip/index.js";
import type { NeighbourhoodWell_component$key } from "#relay/__generated__/NeighbourhoodWell_component.graphql.js";
import neighbourhoodWellFragmentNode from "#relay/__generated__/NeighbourhoodWell_component.graphql.js";
import { buildNeighbourhood } from "./buildNeighbourhood.js";
import { EDGE_FAMILIES, WELL_CSS_CLASS_NAME } from "./constants.js";
import { toNeighbourhoodInput } from "./toNeighbourhoodInput.js";
import type { NeighbourhoodWellProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `NeighbourhoodWell_component` (see
 * `EntityHeader` for the native-import rationale). Every connection rides
 * the page's one `$count` and carries `pageInfo.hasNextPage` so the well
 * can render its partial state honestly. Never invoked.
 */
const neighbourhoodWellFragmentSource = (): unknown => graphql`
  fragment NeighbourhoodWell_component on Component
  @argumentDefinitions(count: { type: "Int!" }) {
    uri
    name
    _meta {
      type {
        uri
        label
        namespace
      }
    }
    tier {
      uri
      name
    }
    subcomponents(first: $count) {
      edges {
        node {
          uri
          name
        }
      }
      pageInfo {
        hasNextPage
      }
    }
    variants(first: $count) {
      edges {
        node {
          uri
          name
        }
      }
      pageInfo {
        hasNextPage
      }
    }
    variantOfs(first: $count) {
      edges {
        node {
          uri
          name
        }
      }
      pageInfo {
        hasNextPage
      }
    }
    inheritsFroms(first: $count) {
      edges {
        node {
          uri
          name
        }
      }
      pageInfo {
        hasNextPage
      }
    }
    specializedBies(first: $count) {
      edges {
        node {
          uri
          name
        }
      }
      pageInfo {
        hasNextPage
      }
    }
    modifierFamilies(first: $count) {
      edges {
        node {
          uri
          name
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;
void neighbourhoodWellFragmentSource;

/** Reads the well node a pointer/focus event landed on, if any. */
const readUriFromEvent = (target: EventTarget | null): string | undefined => {
  if (!(target instanceof Element)) return undefined;
  return target.closest<HTMLElement>("[data-well-uri]")?.dataset.wellUri;
};

/**
 * The entity page's closing section: the component's one-hop ego graph,
 * sunk into an `.underground` well (AX.3 — the reader finishes the
 * document and looks down into the substrate it was projected from).
 *
 * The renderer is deliberately dumb: `buildNeighbourhood` settles every
 * coordinate and path server-side (deterministic — the SSR contract), the
 * SVG below draws edges 1:1 (never scaled — nodes and edges share one px
 * space), and the node layer renders each entity as a positioned CHIP —
 * the same mention primitive prose uses, so the graph is literally the
 * fourth rendering of the entity (AV-302's "one encoding, four
 * renderings"). Linkable chips are real anchors; the rest are inert spans.
 *
 * THE EGO-FADE binds hover AND focus (the HierarchyWell posture): touching
 * a neighbour quiets everything but it, its edge, and the subject.
 * Hover state is CLIENT-ONLY and starts empty, so the first client render
 * reproduces the server's markup byte for byte.
 *
 * Accessibility posture: the graph is a spatial view over nouns the page's
 * own sections already list (properties, relations) — never the only
 * route to any of them. Nodes are real links where a home exists; edge
 * labels are presentational (`aria-hidden`) because the predicate text is
 * decoration over relations the DOM already states.
 */
const NeighbourhoodWell = ({
  className,
  component,
}: NeighbourhoodWellProps): React.ReactElement => {
  const data = useFragment<NeighbourhoodWell_component$key>(
    neighbourhoodWellFragmentNode,
    component,
  );
  const { input, truncated } = useMemo(
    () => toNeighbourhoodInput(data),
    [data],
  );
  const graph = useMemo(() => buildNeighbourhood(input), [input]);
  const [focusedUri, setFocusedUri] = useState<string | undefined>(undefined);

  const quiet = (uri: string): boolean =>
    focusedUri !== undefined && uri !== focusedUri && uri !== input.centreUri;

  return (
    <section
      aria-labelledby="component-entity-neighbourhood"
      className={[WELL_CSS_CLASS_NAME, className].filter(Boolean).join(" ")}
    >
      <h2 id="component-entity-neighbourhood">Neighbourhood</h2>
      {input.neighbours.length === 0 ? (
        <p className="well-empty">
          The graph records no relations for this component yet — a coverage
          gap, not a loading state.
        </p>
      ) : (
        <>
          {/* A figure: a captioned graphic that happens to contain real
              links. The pointer/focus pair drives the ego-fade; both
              resolve the touched node from the DOM (one code path, two
              input modalities — the HierarchyWell posture). */}
          <figure
            aria-label={`${input.centreLabel} and its ${input.neighbours.length} related entities`}
            className="well-canvas underground"
            onBlur={() => setFocusedUri(undefined)}
            onFocus={(event) => setFocusedUri(readUriFromEvent(event.target))}
            onMouseLeave={() => setFocusedUri(undefined)}
            onMouseOver={(event) =>
              setFocusedUri(readUriFromEvent(event.target))
            }
          >
            <div
              className="well-frame"
              style={{ inlineSize: graph.width, blockSize: graph.height }}
            >
              <svg
                aria-hidden="true"
                className="well-edges"
                height={graph.height}
                width={graph.width}
              >
                <defs>
                  <marker
                    id="well-head-structural"
                    markerHeight="9"
                    markerWidth="9"
                    orient="auto-start-reverse"
                    refX="9"
                    refY="5"
                    viewBox="0 0 10 10"
                  >
                    <path
                      className="well-head-structural"
                      d="M 1 1 L 9 5 L 1 9 Z"
                    />
                  </marker>
                  <marker
                    id="well-head-semantic"
                    markerHeight="7"
                    markerWidth="7"
                    orient="auto-start-reverse"
                    refX="8"
                    refY="5"
                    viewBox="0 0 10 10"
                  >
                    <path
                      className="well-head-semantic"
                      d="M 0 1 L 9 5 L 0 9 Z"
                    />
                  </marker>
                </defs>
                {graph.edges.map((edge) => (
                  <g
                    className={[
                      "well-edge",
                      `well-edge-${edge.family}`,
                      quiet(edge.neighbourUri) ? "well-quiet" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={edge.id}
                  >
                    <path
                      d={edge.d}
                      markerEnd={`url(#well-head-${edge.family})`}
                    />
                    {edge.labelAt === undefined ? null : (
                      <text x={edge.labelAt.x} y={edge.labelAt.y}>
                        {edge.predicate}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
              {graph.nodes.map((node) => (
                <div
                  className={[
                    "well-node",
                    node.isCentre ? "well-centre" : "",
                    quiet(node.uri) && !node.isCentre ? "well-quiet" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-well-uri={node.uri}
                  key={node.uri}
                  style={{
                    insetInlineStart: node.x - node.width / 2,
                    insetBlockStart: node.y - node.height / 2,
                    inlineSize: node.width,
                    blockSize: node.height,
                  }}
                >
                  <Chip
                    box={node.box}
                    href={node.isCentre ? undefined : node.href}
                    kind={node.kind}
                    label={node.label}
                    uri={node.uri}
                  />
                </div>
              ))}
            </div>
            <p className="well-hint">
              Hover a node to isolate its relation · click a linked node to
              travel to it
            </p>
            <dl className="well-legend">
              {EDGE_FAMILIES.map((family) => (
                <div className="well-legend-row" key={family.value}>
                  <dt>
                    <svg aria-hidden="true" height="10" width="30">
                      <path
                        className={`well-legend-swatch-${family.value}`}
                        d="M 1 5 L 22 5"
                        markerEnd={`url(#well-head-${family.value})`}
                      />
                    </svg>
                    {family.label}
                  </dt>
                  <dd>{family.description}</dd>
                </div>
              ))}
            </dl>
          </figure>
          {truncated.length === 0 ? null : (
            <p className="well-partial">
              Showing the first page of: {truncated.join(", ")}. The full lists
              live in the sections above.
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default NeighbourhoodWell;
