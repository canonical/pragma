import type { Segment } from "../../../types.js";

export type ItemProps = Segment & {
  /** Indicates whether this segment represents the current page */
  current?: boolean;
};
