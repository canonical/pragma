/**
 * Hook domain types for the virtualization domain. Each hook declares its
 * result type here.
 */

import type { DisplayEntry, RowModel } from "@canonical/dataviews-core";
import type { MountedRange } from "@canonical/dataviews-core/virtualization";
import type { FocusEvent, RefObject } from "react";

/** One windowed body's range, and the handles its elements attach by. */
export type UseVirtualRowsResult = {
  /** The entries to mount, as runs, and the space of the rest. */
  readonly mounted: MountedRange;
  /** The body row group; its parent is the scroll viewport. */
  readonly body: RefObject<HTMLDivElement | null>;
  /**
   * The ref one entry's row attaches by, to be measured and to keep focus.
   * The same function for as long as the row is mounted.
   */
  readonly refFor: (id: string) => (node: HTMLDivElement) => () => void;
  /** Keeps the row focus enters mounted, wherever the viewport goes. */
  readonly onFocus: (event: FocusEvent<HTMLDivElement>) => void;
  /** Lets it go when focus leaves the body, not when it leaves the window. */
  readonly onBlur: (event: FocusEvent<HTMLDivElement>) => void;
};

/** What one windowed body displays, and what its rows' heights hang on. */
export type UseVirtualRowsProps = {
  /** The entries, in display order. */
  readonly entries: readonly DisplayEntry[];
  /** The height a row is placed at until it is measured, in pixels. */
  readonly estimatedRowHeight: number;
  /** The row model, whose replaced records may have new heights. */
  readonly model: RowModel<object>;
  /** The published tracks, whose change re-wraps every row. */
  readonly tracks: string | undefined;
};
