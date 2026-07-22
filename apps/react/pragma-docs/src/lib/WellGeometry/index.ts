/**
 * Shared pure geometry for the wells (AV-364's well grammar v1): the
 * neighbourhood well and the definitions explorer both settle their
 * layouts with these. Everything here is DETERMINISTIC — same input,
 * byte-equal output — because well positions are computed identically on
 * the server and the client (the SSR/hydration contract both wells pin in
 * their tests). No randomness, no measurement, no environment reads.
 */

/** An axis-aligned box addressed by its CENTRE, the wells' node shape. */
export interface WellBox {
  x: number;
  y: number;
  readonly width: number;
  readonly height: number;
}

/** Round to a tenth of a px: keeps SSR output stable across engines. */
export const settle = (value: number): number => Math.round(value * 10) / 10;

/**
 * The point where the segment from `towards` to `box`'s centre crosses
 * the box border (plus a small gap), so edges meet nodes at their edge
 * instead of diving underneath them. Falls back to the centre for
 * degenerate (zero-length) segments.
 */
export const edgeEndpoint = (
  box: Readonly<WellBox>,
  towards: { readonly x: number; readonly y: number },
  gap: number,
): { x: number; y: number } => {
  const dx = towards.x - box.x;
  const dy = towards.y - box.y;
  if (dx === 0 && dy === 0) return { x: box.x, y: box.y };
  const halfWidth = box.width / 2 + gap;
  const halfHeight = box.height / 2 + gap;
  // Slab test: the smallest positive t where the ray leaves the box.
  const tx = dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx);
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy);
  const t = Math.min(tx, ty, 1);
  return { x: box.x + dx * t, y: box.y + dy * t };
};

export interface RelaxOptions {
  /** Breathing room enforced between boxes. */
  readonly gap: number;
  /** Upper bound on passes; the loop exits early once nothing moves. */
  readonly iterations: number;
  /** Indexes that never move (subjects, anchors). */
  readonly pinned?: ReadonlySet<number>;
}

/**
 * The bounded relaxation pass — the exhibit's collision guarantee, made
 * static: every unordered pair of overlapping boxes (plus gap) pushes
 * apart along the axis of least overlap, half each; pinned boxes never
 * move (their partner takes the full shift). Pair order and iteration
 * count are fixed, so the pass is deterministic. Ties push horizontally:
 * labels are wide, rows are shallow.
 */
export const relaxBoxes = (
  boxes: WellBox[],
  { gap, iterations, pinned }: RelaxOptions,
): void => {
  const isPinned = (index: number): boolean => pinned?.has(index) === true;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let moved = false;
    for (let a = 0; a < boxes.length; a += 1) {
      for (let b = a + 1; b < boxes.length; b += 1) {
        const boxA = boxes.at(a);
        const boxB = boxes.at(b);
        if (boxA === undefined || boxB === undefined) continue;
        if (isPinned(a) && isPinned(b)) continue;
        const overlapX =
          (boxA.width + boxB.width) / 2 + gap - Math.abs(boxA.x - boxB.x);
        const overlapY =
          (boxA.height + boxB.height) / 2 + gap - Math.abs(boxA.y - boxB.y);
        if (overlapX <= 0 || overlapY <= 0) continue;
        moved = true;
        const axis = overlapX <= overlapY ? "x" : "y";
        const overlap = axis === "x" ? overlapX : overlapY;
        const sign = (axis === "x" ? boxA.x <= boxB.x : boxA.y <= boxB.y)
          ? -1
          : 1;
        const shiftA = isPinned(a) ? 0 : isPinned(b) ? overlap : overlap / 2;
        const shiftB = isPinned(b) ? 0 : isPinned(a) ? overlap : overlap / 2;
        if (axis === "x") {
          boxA.x += sign * shiftA;
          boxB.x -= sign * shiftB;
        } else {
          boxA.y += sign * shiftA;
          boxB.y -= sign * shiftB;
        }
      }
    }
    if (!moved) break;
  }
};

/** A quadratic arc's path plus its label anchor (the apex, lifted). */
export interface QuadArc {
  readonly d: string;
  readonly labelAt: { readonly x: number; readonly y: number };
}

/**
 * A semantic arc: a quadratic bowing `bow` px off its chord, wearing its
 * label at the curve's apex (t = 0.5). The bow's sign flips which side
 * the arc swells toward; magnitude stacks for parallel edges.
 */
export const quadArc = (
  start: { readonly x: number; readonly y: number },
  end: { readonly x: number; readonly y: number },
  bow: number,
): QuadArc => {
  const middleX = (start.x + end.x) / 2;
  const middleY = (start.y + end.y) / 2;
  const chordX = end.x - start.x;
  const chordY = end.y - start.y;
  const length = Math.hypot(chordX, chordY) || 1;
  const controlX = middleX - (chordY / length) * bow;
  const controlY = middleY + (chordX / length) * bow;
  return {
    d: `M ${settle(start.x)} ${settle(start.y)} Q ${settle(controlX)} ${settle(controlY)} ${settle(end.x)} ${settle(end.y)}`,
    labelAt: {
      x: settle((start.x + end.x + 2 * controlX) / 4),
      y: settle((start.y + end.y + 2 * controlY) / 4 - 6),
    },
  };
};

/**
 * A self-loop: the property whose domain IS its range (`cs:extends`).
 * Swells from the box's east side, label riding beyond the loop.
 */
export const selfLoop = (box: Readonly<WellBox>): QuadArc => {
  const eastX = box.x + box.width / 2;
  return {
    d: `M ${settle(eastX - 4)} ${settle(box.y - 8)} C ${settle(eastX + 52)} ${settle(box.y - 44)}, ${settle(eastX + 52)} ${settle(box.y + 36)}, ${settle(eastX - 2)} ${settle(box.y + 10)}`,
    labelAt: { x: settle(eastX + 56), y: settle(box.y) },
  };
};
