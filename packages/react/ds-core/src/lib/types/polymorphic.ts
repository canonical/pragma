import type { ComponentProps, ElementType } from "react";

/**
 * Utility type for creating polymorphic components in React.
 * This type combines the props of the specified element type with the component's own props,
 * allowing the component to be rendered as different HTML elements or custom components.
 * @template TOwnProps - The props specific to the underlying component.
 * @template TElement - The element type to render as.
 * @example
 * ```ts
 * import type { PolymorphicComponentProps } from '@canonical/ds-types';
 *
 * interface LinkOwnProps {
 *  children?: ReactNode;
 *  appearance?: "soft";
 * }
 * // A link that is, by default, an "a" element, but can be changed via the `as` prop
 * export type LinkProps<TElement extends ElementType = "a"> =
 *   PolymorphicComponentProps<LinkOwnProps, TElement>;
 * ```
 */
export type PolymorphicComponentProps<
  TOwnProps extends Object,
  TElement extends ElementType,
> = TOwnProps & { as?: TElement } & Omit<
    ComponentProps<TElement>,
    keyof TOwnProps
  >;
