import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Group header text, rendered via GroupHeader. Omitted when absent. */
  label?: ReactNode;
  /** The group's navigation entries (Item / ItemExpandable / consumer-supplied). */
  children?: ReactNode;
};

export type GroupProps = OwnProps &
  Omit<ComponentProps<"section">, keyof OwnProps>;
