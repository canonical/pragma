import type { ComponentType, FC, ReactElement, ReactNode } from "react";
import { TooltipArea } from "./common/TooltipArea/index.js";
import type { TooltipAreaProps } from "./common/TooltipArea/types.js";

/**
 * The tooltip options for {@link withTooltip}: everything `TooltipArea` accepts
 * except the wrapped content and the message (which are supplied separately).
 * Includes `open` (force the tooltip open/closed — handy for stories), `icon`,
 * `preferredDirections`, `distance`, `autoFit`, `maxWidth`, timing, etc.
 */
export type WithTooltipOptions = Omit<TooltipAreaProps, "children" | "Message">;

/**
 * A higher-order component that wraps a component with a tooltip.
 * @param Component The component function to wrap. If you need to use a Node instead of a function, use [`TooltipArea`](/?path=/docs/tooltip-withtooltip--docs) instead.
 * @param Message The content of the tooltip
 * @param popupProps Tooltip options forwarded to the underlying `TooltipArea`
 */
const withTooltip = <TProps extends object>(
  Component: ComponentType<TProps>,
  Message: ReactNode,
  popupProps: WithTooltipOptions = {},
): FC<TProps> => {
  const WrappedComponent = (props: TProps): ReactElement<TProps> => {
    return (
      <TooltipArea Message={Message} {...popupProps}>
        <Component {...props} />
      </TooltipArea>
    );
  };

  // Set the displayName for easier debugging
  WrappedComponent.displayName = `withTooltip(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
};

export default withTooltip;
