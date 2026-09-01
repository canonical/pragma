import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Required child contents */
  children: ReactNode;
};

/**
 * Props for Card.Content
 *
 * @implements ds:global.subcomponent.card-content
 */
export type ContentProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
