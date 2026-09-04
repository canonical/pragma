import { Link } from "@canonical/router-react";
import { Handle, type NodeProps, Position, ReactFlow } from "@xyflow/react";
import type React from "react";
import { useMemo } from "react";
import { buildJourneyGraph } from "./buildJourneyGraph.js";
import type { JourneyFlowNode, JourneyWellProps } from "./types.js";
import "@xyflow/react/dist/style.css";
import "./styles.css";

const componentCssClassName = "ds journey-well";

/**
 * One hop in a journey. A JOB node is a real router link — the job is the
 * lens's addressable thing (P-D7), so selecting one is a navigation, not
 * component state. A SURFACE node links out to the docsite route that
 * surface lives at WHEN ONE EXISTS (`ROUTE_BY_SURFACE`); where the site
 * renders no such page the node is plain text rather than a dead link,
 * which is the honest rendering of a surface we do not yet build.
 *
 * Every other hop is static text: coordinates and pairings are not places
 * on this site, and inventing addresses for them would be inventing pages.
 *
 * The label is `title`-attributed as well as rendered: node geometry is
 * fixed for SSR determinism (no text measurement is available on the
 * server), so a long name ellipsises and the tooltip is how the full name
 * stays recoverable — the hierarchy well's idiom exactly.
 *
 * The kind rides as real text in a `data-kind` attribute AND as the node's
 * visible column, so the distinction survives with styling off rather than
 * living in position alone.
 */
const HopNode = ({ data }: NodeProps<JourneyFlowNode>): React.ReactElement => {
  const label = data.label;
  let body: React.ReactElement;
  if (data.kind === "job") {
    body = (
      <Link
        className="journey-node-link"
        params={{ job: data.uri }}
        title={label}
        to="journeysJob"
      >
        {label}
      </Link>
    );
  } else if (data.href !== undefined) {
    body = (
      <a className="journey-node-link" href={data.href} title={label}>
        {label}
      </a>
    );
  } else {
    body = (
      <span className="journey-node-text" title={label}>
        {label}
      </span>
    );
  }

  return (
    <div className="journey-node-shell" data-kind={data.kind}>
      {/* The handle DOM the edges anchor to. React Flow v12 renders NO handle
          elements for a non-connectable node and re-measures handle positions
          from the DOM on the client — so without these, every edge loses its
          anchor after hydration and vanishes (the same "Couldn't create edge
          for target handle" failure the definitions well had). Rendered
          non-connectable and visually hidden (.react-flow__handle in the well
          CSS). Positions MIRROR buildJourneyGraph's HANDLES: the spine runs
          left→right, so source is on the Right, target on the Left. */}
      <Handle isConnectable={false} position={Position.Right} type="source" />
      <Handle isConnectable={false} position={Position.Left} type="target" />
      {body}
      {data.surfaceType === undefined ? null : (
        <span className="journey-node-tag">{data.surfaceType}</span>
      )}
    </div>
  );
};

/** Module-scope node-type map — a stable identity, as React Flow requires. */
const nodeTypes = { hop: HopNode };

/**
 * The initial camera: a deterministic constant, NEVER a measured fit.
 * `fitView` is forbidden here — it measures the container, which the
 * server cannot do, so the server and the client would disagree about the
 * transform and hydration would have something to reconcile. 0.6 shows a
 * single coordinate's journeys whole on a typical canvas, and the flow
 * pans/zooms from there.
 */
const DEFAULT_VIEWPORT = { x: 24, y: 24, zoom: 0.6 };

/**
 * The well's legend: what the columns mean and what an edge's weight says.
 * Static markup — the vocabulary is the ontology's, fixed at build time,
 * so nothing here reads the graph.
 *
 * The LAYOUT column's note is the honest-absence statement in the
 * interface itself: most surfaces compose no layout, and the empty column
 * is the signal rather than a rendering fault.
 */
const JourneyLegend = (): React.ReactElement => (
  <div className="journey-furniture journey-legend">
    <p className="journey-legend-title">Reading a row</p>
    <ol className="journey-legend-columns">
      <li>Coordinate — who, in what role, at what fluency</li>
      <li>Job — the demand, in the reader&rsquo;s own words</li>
      <li>Pairing — the commitment that serves it</li>
      <li>Surface — where it is served</li>
      <li>Layout — the composition, where one is composed</li>
    </ol>
    <p className="journey-legend-note">
      A row that ends at its surface composes no layout. That is the
      model&rsquo;s own silence, not a missing link.
    </p>
  </div>
);

/**
 * The Journeys lens's centre panel: the demand model's left-to-right
 * spine in the shell's underground well (the `.underground` hook — the
 * depression you look INTO, AX.3). Rendered with React Flow v12, whose SSR
 * path renders the full node DOM server-side because every node carries
 * explicit `width`/`height` and both `handles` from the deterministic
 * layout (`buildJourneyGraph`).
 *
 * THE SSR DETERMINISM CONTRACT, in one place:
 *   - positions come from `buildJourneyGraph` and are pure over the data;
 *   - node dimensions are explicit constants, never measured;
 *   - `defaultViewport` is a constant, and `fitView` is never used;
 *   - both handles carry node-relative coordinates, so edge paths are
 *     computable without a browser;
 *   - there is NO client-only state in this component at all — no hover,
 *     no focus, no filter. The whole component is a pure function of its
 *     props, so the first client render reproduces the server's markup by
 *     construction rather than by argument.
 *
 * WHAT DECORATION MEANS HERE. `pairingRole` becomes edge WEIGHT and
 * `arrival` becomes edge DECORATION, both through classNames the
 * stylesheet owns (see `buildJourneyGraph`'s `roleClassName` /
 * `arrivalClassName`). Neither ever moves a node: the layout is a function
 * of the model's shape alone, so two renders of the same data are
 * byte-identical whatever the roles say.
 *
 * Accessibility posture: the well carries an accessible name and its job
 * nodes are real links — but the COMPLETE keyboard path through the lens
 * is the JourneyRail, which lists every job this graph draws; the well is
 * a spatial view over the same nouns, never the only route to any of them.
 *
 * Containment: nothing inside the flow uses `position: fixed` — the
 * canvas's `container-type` makes it the containing block for fixed
 * descendants (INTRINSIC-GRID.md entry 5), so a fixed element here would
 * silently anchor to the wrong box. Controls/minimap are not rendered.
 */
const JourneyWell = ({
  className,
  coordinates,
  job,
}: JourneyWellProps): React.ReactElement => {
  const { nodes, edges } = useMemo(
    () => buildJourneyGraph(coordinates),
    [coordinates],
  );

  // Selection is the URL's job, marked by className so it is a pure
  // projection of props — the same input the server had.
  const decorated = useMemo(
    () =>
      nodes.map((node) =>
        node.id === job ? { ...node, className: "is-selected" } : node,
      ),
    [nodes, job],
  );

  return (
    <div
      className={[componentCssClassName, "underground", className]
        .filter(Boolean)
        .join(" ")}
      data-slot="journeys-canvas"
    >
      <ReactFlow
        aria-label="Journeys from demand to surface"
        defaultViewport={DEFAULT_VIEWPORT}
        edges={[...edges]}
        elementsSelectable={false}
        maxZoom={2}
        minZoom={0.2}
        nodes={[...decorated]}
        nodesConnectable={false}
        nodesDraggable={false}
        nodeTypes={nodeTypes}
      />
      {/* Canvas-local furniture: the ONE floating hint over the graph. Its
          text is a pure function of `job` (the URL — identical on server and
          client), so it costs the hydration argument nothing. With no job
          selected it also names the empty-selection action the explorer used
          to state in a separate band above the well; that band is gone, so
          the graph now fills the whole surface. */}
      <p className="journey-furniture journey-hint">
        {job === undefined
          ? "Showing the default coordinate — select a job, from the rail or the diagram, to centre the graph on it"
          : "Drag to pan · scroll to zoom · select a job to inspect it"}
      </p>
      <JourneyLegend />
    </div>
  );
};

export default JourneyWell;
