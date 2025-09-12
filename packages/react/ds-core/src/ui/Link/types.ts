/* @canonical/generator-ds 0.10.0-experimental.2 */

import type {
  AnchorHTMLAttributes,
  ComponentPropsWithoutRef,
  ElementType,
  HTMLAttributes,
  ReactNode,
} from "react";

interface BaseProps extends HTMLAttributes<HTMLElement> {
  /** Additional CSS classes */
  className?: string;
  /** Content to display in the link */
  children?: ReactNode;
  /** Link appearance modifier */
  appearance?: "soft";
  /** Content to show on hover/focus */
  // TODO consider removing this from here for simplicity's sake, consider its use case as a separate component like "Anchor Link"? https://vanillaframework.io/docs/patterns/links#anchor-link
  activationContents?: ReactNode;
}

/*
Allow for different props based on the `as` prop, which allows the Link component to be used as another element.
This makes the link more flexible; for example, it allows users to use Router framework links with our Link component.
 */

type AnchorProps = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { as?: "a" };
// omit `appearance` to allow TS binding to the `appearance` prop of the custom element rather than the link element
// todo this isn't working but we likely need to solve it somehow
type CustomProps = Omit<BaseProps, "appearance"> & {
  as: ElementType;
} & ComponentPropsWithoutRef<ElementType>;

export type LinkProps = AnchorProps | CustomProps;
