import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Required child contents */
  children: ReactNode;
};

/**
 * Props for Card.Header
 *
 * @implements ds:global.subcomponent.card-header
 */
export type HeaderProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
