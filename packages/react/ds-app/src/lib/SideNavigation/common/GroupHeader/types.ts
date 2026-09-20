import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** Header text. */
  children?: ReactNode;
};

export type GroupHeaderProps = OwnProps &
  Omit<ComponentProps<"span">, keyof OwnProps>;
