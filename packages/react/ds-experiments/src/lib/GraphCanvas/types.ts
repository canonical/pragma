import type { HTMLAttributes } from "react";
import type {
  GraphEntity,
  GraphPosition,
  GraphRelation,
} from "../../graph/types.js";

export interface GraphCanvasProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The entities to draw as nodes. */
  entities: GraphEntity[];
  /** The relations to draw as edges between those entities. */
  relations: GraphRelation[];
  /**
   * Curated positions keyed by entity id. Entities without one are placed by
   * the deterministic layered layout, so partial curation is fine.
   */
  positions?: Record<string, GraphPosition>;
  /** Height of the canvas; a number is treated as pixels. Defaults to `480`. */
  height?: number | string;
  /** Show the legend panel. Defaults to `true`. */
  showLegend?: boolean;
  /** Show the zoom/fit controls. Defaults to `true`. */
  showControls?: boolean;
  /** Show the dotted background. Defaults to `true`. */
  showBackground?: boolean;
  /** Fit the graph to the viewport on mount. Defaults to `true`. */
  fitView?: boolean;
}
