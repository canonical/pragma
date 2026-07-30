import { Link } from "@canonical/router-react";
import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { graphql, useFragment } from "react-relay";
import type { HierarchyWell_ontologies$key } from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import hierarchyWellFragmentNode from "#relay/__generated__/HierarchyWell_ontologies.graphql.js";
import { buildClassGraph } from "./buildClassGraph.js";
import { decorateForView } from "./decorateGraph.js";
import type { HierarchyWellProps, TermFlowNode } from "./types.js";
import WellLegend from "./WellLegend.js";
import "./styles.css";

/**
 * Codegen source of truth for `HierarchyWell_ontologies` (see the
 * components lens's `EntityHeader` for the native-import rationale).
 * `namespace` rides along because the graph returns FULL IRIs and the
 * well's node ids are prefixed term addresses (see `uris.ts`).
 * `properties` is the AV-364 addition: object properties whose domain and
 * range are both drawn classes become the SEMANTIC edge family — the
 * relations whose absence made the old well read as an organigram.
 * Never invoked.
 */
const hierarchyWellFragmentSource = (): unknown => graphql`
  fragment HierarchyWell_ontologies on Ontology @relay(plural: true) {
    prefix
    namespace
    classes {
      uri
      label
      isAbstract
      superclass {
        uri
      }
    }
    properties {
      uri
      label
      kind
      domain {
        uri
      }
      range
    }
  }
`;
void hierarchyWellFragmentSource;

const componentCssClassName = "ds hierarchy-well";

/** The camera's zoom bounds; panning is unbounded (the graph is finite). */
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
/** The initial camera offset — a constant, never a measured fit (SSR). */
const CAMERA_MARGIN = 24;

/**
 * A class node: a real term link, so the graph's nodes are anchors — they
 * SSR as content, hover-prefetch their term, and navigate through the
 * router (URL state, never component state). Selection is the address:
 * the router's `Link` stamps `aria-current="page"` on the current term's
 * node, which the stylesheet raises.
 *
 * Abstract classes are marked the way the exhibit marks them: the label
 * goes italic and a small ABSTRACT tag rides underneath — real text, so
 * the distinction survives with styling off rather than living in colour
 * alone. The tag sits OUTSIDE the anchor: a node's accessible name must
 * be the term itself, never the term plus its decoration.
 *
 * The label is `title`-attributed as well as rendered: node geometry is
 * ESTIMATED from the label (no text measurement exists on the server), so
 * a long class name ellipsises and the tooltip keeps it recoverable.
 */
const TermNode = ({ node }: { node: TermFlowNode }): React.ReactElement => (
  <div
    className={["hierarchy-node-shell", node.className]
      .filter(Boolean)
      .join(" ")}
    data-id={node.id}
    style={{
      insetInlineStart: node.x - node.width / 2,
      insetBlockStart: node.y - node.height / 2,
      inlineSize: node.width,
      blockSize: node.height,
    }}
  >
    <Link
      className={[
        "hierarchy-node",
        node.data.isAbstract ? "hierarchy-node-abstract" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      params={{ term: node.data.term }}
      title={node.data.label}
      to="definitionsTerm"
    >
      {node.data.label}
    </Link>
    {node.data.isAbstract ? (
      <span className="hierarchy-node-tag">abstract</span>
    ) : null}
  </div>
);

/**
 * The explorer's centre panel: the class graph in the shell's underground
 * well (AX.3), rendered by the bespoke well renderer (AV-364 — React
 * Flow retired here): an SVG edge layer under an HTML node layer, both in
 * ONE 1:1 px space inside a transformed camera, so nodes stay real links
 * with crisp DOM text and the edges can carry the full grammar (straight
 * structural hairlines, labelled semantic arcs, hollow vs filled heads).
 *
 * THE CAMERA. Pan by dragging the floor, zoom by wheel (toward the
 * cursor). The INITIAL camera is a pure function of the graph
 * (`fitScale`) — a constant on both sides of hydration, exactly as the
 * old DEFAULT_VIEWPORT was; the listeners only mutate it client-side,
 * after hydration. The wheel listener is attached non-passively in an
 * effect because it must preventDefault the page scroll.
 *
 * THE ASYMMETRY: this graph HIDES what the filter excludes (and drops any
 * edge that loses an endpoint), where the rail merely dims. Hiding is by
 * `className` only — positions never change (`decorateGraph.ts`), so a
 * chip toggling back on restores the picture exactly. We dim; we never
 * move.
 *
 * PREDICATE LABELS answer to the ego centre: an arc wears its name only
 * while incident to the hovered/selected term. Ambient density stays low;
 * interaction reveals — alive means responsive, not restless.
 *
 * Hover/focus rides the SHARED `hoverCentre` exactly as before: one
 * DOM-resolving code path (`data-id` closest-walk) serves pointer and
 * keyboard; state is client-only and starts empty, so first client paint
 * reproduces the server's selection-only markup byte for byte.
 *
 * Accessibility posture: unchanged — every node is a real link, but the
 * COMPLETE keyboard path through the explorer is the TermRail; the well
 * is a spatial view over the same nouns, never the only route to any.
 */
const HierarchyWell = ({
  className,
  filter,
  ontologies,
  term,
  hoverCentre,
  onHoverTerm,
}: HierarchyWellProps): React.ReactElement => {
  const data = useFragment<HierarchyWell_ontologies$key>(
    hierarchyWellFragmentNode,
    ontologies,
  );
  const graph = useMemo(() => buildClassGraph(data), [data]);

  const focused = hoverCentre;

  // The graph answers ONLY to the chip axes; text is rail-only by
  // contract, so it is excluded from the memo's inputs entirely (typing
  // must never re-decorate the graph, even by accident).
  const { abstractions, namespaces } = filter;
  const { nodes, edges } = useMemo(
    () =>
      decorateForView(graph, {
        selected: term,
        focused,
        filter: { text: "", abstractions, namespaces },
      }),
    [graph, term, focused, abstractions, namespaces],
  );

  // The label centre: transient focus wins, else the URL's selection —
  // server-safe by the same argument as the decorate pass.
  const labelCentre = focused ?? term;

  const [camera, setCamera] = useState(() => ({
    x: CAMERA_MARGIN,
    y: CAMERA_MARGIN,
    k: graph.fitScale,
  }));
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ startX: number; startY: number } | undefined>(
    undefined,
  );

  // Wheel zoom, toward the cursor. Non-passive: the well owns the wheel.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      setCamera((current) => {
        const next = Math.min(
          Math.max(current.k * Math.exp(-event.deltaY * 0.0015), MIN_ZOOM),
          MAX_ZOOM,
        );
        const ratio = next / current.k;
        return {
          k: next,
          x: pointerX - (pointerX - current.x) * ratio,
          y: pointerY - (pointerY - current.y) * ratio,
        };
      });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const readTermFromEvent = useCallback(
    (target: EventTarget | null): string | undefined => {
      if (!(target instanceof Element)) return undefined;
      return target.closest<HTMLElement>("[data-id]")?.dataset.id;
    },
    [],
  );

  return (
    <div
      className={[componentCssClassName, "underground", className]
        .filter(Boolean)
        .join(" ")}
      data-slot="explorer-canvas"
    >
      <div
        aria-label="Class hierarchy"
        className="hierarchy-canvas"
        onBlur={() => onHoverTerm(undefined)}
        onFocus={(event) => onHoverTerm(readTermFromEvent(event.target))}
        onMouseLeave={() => onHoverTerm(undefined)}
        onMouseOver={(event) => onHoverTerm(readTermFromEvent(event.target))}
        onPointerDown={(event) => {
          // Pan starts on the floor only — a press on a node is a click.
          if (!(event.target instanceof Element)) return;
          if (event.target.closest("a") !== null) return;
          drag.current = {
            startX: event.clientX - camera.x,
            startY: event.clientY - camera.y,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const active = drag.current;
          if (active === undefined) return;
          setCamera((current) => ({
            ...current,
            x: event.clientX - active.startX,
            y: event.clientY - active.startY,
          }));
        }}
        onPointerUp={() => {
          drag.current = undefined;
        }}
        ref={canvasRef}
        role="group"
      >
        <div
          className="hierarchy-camera"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.k})`,
          }}
        >
          <svg
            aria-hidden="true"
            className="hierarchy-edges"
            height={graph.height}
            width={graph.width}
          >
            <defs>
              <marker
                id="hw-head-structural"
                markerHeight="9"
                markerWidth="9"
                orient="auto-start-reverse"
                refX="9"
                refY="5"
                viewBox="0 0 10 10"
              >
                <path className="hw-head-structural" d="M 1 1 L 9 5 L 1 9 Z" />
              </marker>
              <marker
                id="hw-head-semantic"
                markerHeight="7"
                markerWidth="7"
                orient="auto-start-reverse"
                refX="8"
                refY="5"
                viewBox="0 0 10 10"
              >
                <path className="hw-head-semantic" d="M 0 1 L 9 5 L 0 9 Z" />
              </marker>
            </defs>
            {graph.clusters.map((cluster) => (
              <text
                className="hierarchy-cluster-caption"
                key={cluster.prefix}
                x={cluster.x}
                y={cluster.y - 20}
              >
                {cluster.prefix}
              </text>
            ))}
            {edges.map((edge) => {
              const incident =
                labelCentre !== undefined &&
                (edge.source === labelCentre || edge.target === labelCentre);
              return (
                <g
                  className={[
                    "hierarchy-edge",
                    `hierarchy-edge-${edge.family}`,
                    incident ? "is-incident" : "",
                    edge.className,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={edge.id}
                >
                  <path d={edge.d} markerEnd={`url(#hw-head-${edge.family})`} />
                  {edge.labelAt === undefined ? null : (
                    <text x={edge.labelAt.x} y={edge.labelAt.y}>
                      {edge.predicate}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {nodes.map((node) => (
            <TermNode key={node.id} node={node} />
          ))}
        </div>
      </div>
      {/* Canvas-local furniture: static, so it costs the hydration
          argument nothing. */}
      <p className="hierarchy-furniture hierarchy-hint">
        Drag to pan · scroll to zoom · select a class to inspect it
      </p>
      <WellLegend />
    </div>
  );
};

/**
 * Memoised at the boundary: the explorer re-renders on every keystroke in
 * the search box (the shared filter's `text` changes), but the WELL does
 * not answer to text. The comparator re-renders on exactly the inputs the
 * decoration reads: the fragment ref, the selected term, the chip axes,
 * and the shared `hoverCentre` (a rail hover MUST reach the graph).
 * `onHoverTerm` is a stable callback the explorer memoises; comparing it
 * would defeat the memo on every render.
 */
export default memo(HierarchyWell, (previous, next) => {
  if (
    previous.ontologies !== next.ontologies ||
    previous.term !== next.term ||
    previous.className !== next.className ||
    previous.hoverCentre !== next.hoverCentre
  ) {
    return false;
  }
  return (
    previous.filter.abstractions === next.filter.abstractions &&
    previous.filter.namespaces === next.filter.namespaces
  );
});
