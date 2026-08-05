/**
 * The journey well's DETERMINISTIC layout: the demand model's coordinate →
 * job → pairing → surface → layout spine in, a fully-positioned React Flow
 * node/edge model out. Pure — same input, byte-equal output
 * (`buildJourneyGraph.tests.ts` pins it) — because the positions must be
 * computed identically on the server and the client: React Flow v12 renders
 * the full node DOM during SSR only when every node carries explicit
 * `width`/`height` (and `handles`, for server-rendered edge paths), so any
 * nondeterminism here surfaces as a hydration mismatch.
 *
 * LAYOUT MODEL — the hierarchy well transposed. There, ontologies are
 * blocks of layers running top-down; here the journey runs LEFT TO RIGHT,
 * because a journey is a path and a path reads along the line of text:
 *
 *   x = the hop's column   (coordinate | job | pairing | surface | layout)
 *   y = the row the journey occupies
 *
 * Handles follow the axis: every node carries a Right source and a Left
 * target, so a hop's edge leaves its right edge and lands on the next
 * hop's left edge — computable server-side, exactly as the vertical well's
 * Top/Bottom pair is.
 *
 * ROWS ARE ALLOCATED, NEVER MEASURED. Each journey (one coordinate → one
 * job → one pairing → …) claims a row; a node shared by several rows (the
 * coordinate every job hangs off, a surface two jobs both reach) is placed
 * ONCE, at the mean of the rows it serves, rounded. That keeps a shared
 * node visually between its dependents without any force simulation, and —
 * because the mean of a fixed integer set is a fixed rational — it stays
 * exactly reproducible.
 *
 * SORTING IS EXPLICIT. The graph's result order is insertion order and is
 * byte-identical across fresh stores, but this function does not trust
 * that: every collection it walks is sorted by URI first. A layout that
 * silently depended on server iteration order would be a hydration bug
 * waiting for the day the store changes.
 *
 * HONEST ABSENCE (ruling R2). Most surfaces compose no layout — 16 of 133
 * pairings reach one. Where a journey has no layout hop, this function
 * emits NO layout node and NO trailing edge, and the row simply ends at
 * its surface. It does NOT invent one by walking the `within` chain: the
 * ontology declares no layout-inheritance rule, and a lens that applied
 * one would be asserting something the model does not say. The empty
 * column is the signal — it reads as a coverage gap to fix upstream,
 * which is exactly what it is.
 */

import { Position } from "@xyflow/react";
import type { HopKind, JourneyFlowEdge, JourneyFlowNode } from "./types.js";

/** Explicit node metrics — the SSR contract (see module doc). */
export const NODE_WIDTH = 176;
export const NODE_HEIGHT = 44;
/** Gaps: between columns (x), between rows (y). */
export const COLUMN_GAP = 72;
export const ROW_GAP = 20;

/** The column index of each hop kind — the x axis, in one place. */
const COLUMN_INDEX: Readonly<Record<HopKind, number>> = {
  coordinate: 0,
  job: 1,
  pairing: 2,
  surface: 3,
  layout: 4,
};

/** A node's x from its column: constant stride, no measurement. */
const columnX = (kind: HopKind): number =>
  COLUMN_INDEX[kind] * (NODE_WIDTH + COLUMN_GAP);

/** A row's y: constant stride, no measurement. */
const rowY = (row: number): number => row * (NODE_HEIGHT + ROW_GAP);

/** Both handles, node-relative, so edge paths are computable server-side. */
const HANDLES = [
  {
    type: "source" as const,
    position: Position.Right,
    x: NODE_WIDTH,
    y: NODE_HEIGHT / 2,
  },
  {
    type: "target" as const,
    position: Position.Left,
    x: 0,
    y: NODE_HEIGHT / 2,
  },
];

/** One pairing as the fragment delivers it. */
export interface JourneyPairing {
  readonly uri: string;
  readonly label?: string | null | undefined;
  readonly role?: string | null | undefined;
  readonly arrival?: string | null | undefined;
  readonly surface?:
    | {
        readonly uri: string;
        readonly label?: string | null | undefined;
        readonly surfaceType?: string | null | undefined;
        readonly href?: string | null | undefined;
        readonly layout?:
          | { readonly uri: string; readonly label?: string | null | undefined }
          | null
          | undefined;
      }
    | null
    | undefined;
}

/** One job as the fragment delivers it. */
export interface JourneyJob {
  readonly uri: string;
  readonly label?: string | null | undefined;
  /** The job's story, VERBATIM — the reader's own sentence. Threaded so a
   * surface (the rail) can show a legible line rather than the URI slug;
   * undefined when the graph holds none. */
  readonly story?: string | null | undefined;
  readonly pairings: readonly JourneyPairing[];
}

/** One coordinate — the diagram's root (ruling R1: never the persona). */
export interface JourneyCoordinate {
  readonly uri: string;
  readonly label?: string | null | undefined;
  readonly jobs: readonly JourneyJob[];
}

/** The positioned graph: React Flow's inputs, deterministic. */
export interface JourneyGraph {
  readonly nodes: readonly JourneyFlowNode[];
  readonly edges: readonly JourneyFlowEdge[];
}

/** Sort a collection by URI — the explicit order the layout depends on. */
const byUri = <T extends { readonly uri: string }>(
  items: readonly T[],
): readonly T[] =>
  [...items].sort((a, b) => (a.uri < b.uri ? -1 : a.uri > b.uri ? 1 : 0));

/**
 * A node under construction: its data plus every row it participates in,
 * so a shared node can be centred once all its rows are known.
 */
interface Placement {
  readonly kind: HopKind;
  readonly label: string;
  readonly surfaceType?: string | undefined;
  readonly role?: string | undefined;
  readonly arrival?: string | undefined;
  readonly href?: string | undefined;
  readonly rows: number[];
}

/**
 * Build the positioned journey graph. Node ids are the graph's own URIs —
 * the same strings the routes address — so selection and links need no
 * translation.
 *
 * The walk allocates one row per (job, pairing) leaf, which is what makes
 * the diagram a set of PATHS rather than a cloud: every row is one
 * readable left-to-right sentence.
 */
export const buildJourneyGraph = (
  coordinates: readonly JourneyCoordinate[],
): JourneyGraph => {
  const placements = new Map<string, Placement>();
  const edgeIds = new Set<string>();
  const edges: JourneyFlowEdge[] = [];
  let row = 0;

  /** Record a node's presence on a row, creating it on first sight. */
  const place = (
    uri: string,
    seed: Omit<Placement, "rows">,
    onRow: number,
  ): void => {
    const existing = placements.get(uri);
    if (existing === undefined) {
      placements.set(uri, { ...seed, rows: [onRow] });
      return;
    }
    existing.rows.push(onRow);
  };

  /** Connect two hops once; a repeated pair is the same edge, not a second. */
  const connect = (
    source: string,
    target: string,
    className?: string,
  ): void => {
    const id = `${source}=>${target}`;
    if (edgeIds.has(id)) return;
    edgeIds.add(id);
    edges.push({
      id,
      source,
      target,
      type: "smoothstep",
      ...(className === undefined ? {} : { className }),
    });
  };

  for (const coordinate of byUri(coordinates)) {
    for (const job of byUri(coordinate.jobs)) {
      const pairings = byUri(job.pairings);
      // A job with no pairings still earns a row: it is demand nothing
      // serves, which is precisely the thing worth seeing.
      if (pairings.length === 0) {
        place(
          coordinate.uri,
          { kind: "coordinate", label: coordinate.label ?? coordinate.uri },
          row,
        );
        place(job.uri, { kind: "job", label: job.label ?? job.uri }, row);
        connect(coordinate.uri, job.uri);
        row += 1;
        continue;
      }

      for (const pairing of pairings) {
        place(
          coordinate.uri,
          { kind: "coordinate", label: coordinate.label ?? coordinate.uri },
          row,
        );
        place(job.uri, { kind: "job", label: job.label ?? job.uri }, row);
        place(
          pairing.uri,
          {
            kind: "pairing",
            label: pairing.label ?? pairing.uri,
            role: pairing.role ?? undefined,
            arrival: pairing.arrival ?? undefined,
          },
          row,
        );
        connect(coordinate.uri, job.uri);
        // Role decorates the edge into the pairing — weight, never position.
        connect(job.uri, pairing.uri, roleClassName(pairing.role));

        const surface = pairing.surface;
        if (surface != null) {
          place(
            surface.uri,
            {
              kind: "surface",
              label: surface.label ?? surface.uri,
              surfaceType: surface.surfaceType ?? undefined,
              href: surface.href ?? undefined,
            },
            row,
          );
          connect(pairing.uri, surface.uri, arrivalClassName(pairing.arrival));

          // HONEST ABSENCE: only when the surface genuinely composes one.
          const layout = surface.layout;
          if (layout != null) {
            place(
              layout.uri,
              { kind: "layout", label: layout.label ?? layout.uri },
              row,
            );
            connect(surface.uri, layout.uri);
          }
        }
        row += 1;
      }
    }
  }

  const nodes: JourneyFlowNode[] = [];
  for (const [uri, placement] of placements) {
    // A shared node centres on the mean of its rows, SNAPPED TO THE HALF
    // ROW. The snap is what makes this reproducible in the only way that
    // matters: a raw mean is a float (1/3 of a row is 0.333…), and a float
    // multiplied into a pixel position is exactly the kind of value that
    // can differ in its last bit between two JS engines — the server's and
    // the browser's. Rounding to halves collapses every mean onto a small
    // set of exactly-representable values (x.0 and x.5 are both binary
    // fractions), so the position is bit-identical wherever it is computed.
    // Halves rather than whole rows because a node shared by two adjacent
    // rows should sit BETWEEN them, which is the common case here.
    const mean =
      placement.rows.reduce((sum, value) => sum + value, 0) /
      placement.rows.length;
    nodes.push({
      id: uri,
      type: "hop",
      position: {
        x: columnX(placement.kind),
        y: rowY(Math.round(mean * 2) / 2),
      },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      handles: HANDLES,
      draggable: false,
      connectable: false,
      data: {
        uri,
        label: placement.label,
        kind: placement.kind,
        surfaceType: placement.surfaceType,
        role: placement.role,
        arrival: placement.arrival,
        href: placement.href,
      },
    });
  }

  return { nodes, edges };
};

/** The class names this module emits — the CSS contract, in one place. */
export const ROLE_PRIMARY_CLASS = "is-primary";
export const ROLE_SECONDARY_CLASS = "is-secondary";
export const ARRIVAL_CLASS_PREFIX = "arrival-";

/**
 * The local name of a vocabulary URI. The demand model's vocabulary terms
 * arrive in TWO forms depending on how the store resolved them — full
 * (`sem://surface#Primary`) or prefixed (`surface:Primary`) — so the
 * separator is either `#` or `:`. Splitting on both is what keeps the
 * mapping honest against real responses rather than against one sample.
 */
const localName = (uri: string): string | undefined => {
  const local = uri.split(/[#:]/).at(-1);
  return local === undefined || local.length === 0 ? undefined : local;
};

/**
 * Edge weight from the pairing's role. `PairingRole` is an OBJECT type
 * carrying a URI, not a GraphQL enum, so the mapping is by local name —
 * and an unrecognised role decorates nothing rather than guessing.
 */
export const roleClassName = (
  role: string | null | undefined,
): string | undefined => {
  if (role == null) return undefined;
  const local = localName(role);
  if (local === "Primary") return ROLE_PRIMARY_CLASS;
  if (local === "Secondary") return ROLE_SECONDARY_CLASS;
  return undefined;
};

/**
 * Edge decoration from the pairing's arrival, by local name for the same
 * reason. Absent arrival decorates nothing: 34 of 133 pairings carry none
 * and ports carry none by rule, so "no class" is the honest rendering of
 * a fact rather than a fallback.
 */
export const arrivalClassName = (
  arrival: string | null | undefined,
): string | undefined => {
  if (arrival == null) return undefined;
  const local = localName(arrival);
  if (local === undefined) return undefined;
  return `${ARRIVAL_CLASS_PREFIX}${local.toLowerCase()}`;
};
