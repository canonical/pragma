import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Required child contents: tags and labels (e.g. `Chip`), not CTAs or links */
  children: ReactNode;
};

/**
 * Props for Card.Footer
 *
 * @implements ds:global.subcomponent.card-footer
 */
export type FooterProps = OwnProps &
  Omit<ComponentProps<"div">, keyof OwnProps>;
