import type { ComponentProps } from "react";

type OwnProps = {
  /**
   * Destination for the home link. Defaults to "/".
   *
   * Design-system owned: the component supplies the default, so it is declared
   * here rather than inherited from the anchor's native props.
   */
  href?: string;
};

/**
 * Props for the CanonicalLogo component.
 */
export type CanonicalLogoProps = OwnProps &
  Omit<ComponentProps<"a">, keyof OwnProps>;
