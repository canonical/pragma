import type { ComponentProps, ReactNode } from "react";

type OwnProps = {
  /** The code to render. */
  children?: ReactNode;
};

/** Props for the InlineCode component, extending its native `<code>` root. */
export type InlineCodeProps = OwnProps &
  Omit<ComponentProps<"code">, keyof OwnProps>;
