import type { DataViewsMessages } from "@canonical/dataviews-core";
import type { ComponentProps, ReactNode } from "react";

/**
 * One renderer a switch offers: its identity, the name the choice shows, and
 * what it renders once chosen.
 *
 * @experimental Pre-release: a work-in-progress spike, not admitted to the
 * package root; its shape may change or it may be withdrawn.
 */
export type RendererChoice = {
  /** The renderer's identity, unique within the switch. */
  readonly id: string;
  /** The renderer's name, shown beside its choice and naming its region. */
  readonly label: string;
  /** What the renderer draws: a table, cards or anything else the application places. */
  readonly content: ReactNode;
};

type OwnProps = {
  /**
   * The switch's accessible name, and the legend of its choices. Defaults to
   * the messages' `renderer`.
   */
  readonly label?: string;
  /** The renderers offered, in order; the first is shown until another is chosen. */
  readonly renderers: readonly RendererChoice[];
  /**
   * The words the switch speaks, over English. A spike is its own root, so it
   * takes them itself, as a standalone `DataTable` or `PaginationBar` does.
   */
  readonly messages?: Partial<DataViewsMessages>;
};

/**
 * RendererSwitch props. The root is a `section` named by `label`, so it
 * extends native section props, less `children`, since what it holds is the
 * renderers it is given, and `aria-label` and `aria-labelledby`, which `label`
 * sets.
 *
 * @experimental Pre-release: a work-in-progress spike, not admitted to the
 * package root; its shape may change or it may be withdrawn.
 */
export type RendererSwitchProps = OwnProps &
  Omit<
    ComponentProps<"section">,
    keyof OwnProps | "children" | "aria-label" | "aria-labelledby"
  >;
