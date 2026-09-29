import type { ComponentType, FC, ReactElement, ReactNode } from "react";
import TooltipEngine from "./TooltipEngine.js";
import type { WithTooltipOptions } from "./types.js";

/**
 * A higher-order component that wraps a component with a tooltip. It is the
 * single public tooltip primitive: it owns the engine (hover-mode
 * {@link useDisclosure}, client-only portal, arrow positioning) and renders
 * the wrapped component as the tooltip target.
 *
 * `Message` is fixed at wrap time — not reactive to the wrapped component's
 * props. When the message must follow prop state (e.g. a toggle whose
 * tooltip names the current action), render {@link TooltipEngine} directly
 * with a live `Message`; one stable element type also keeps the target
 * mounted across state changes, preserving focus and hover state.
 *
 * @param Component The component type to wrap.
 * @param Message The content of the tooltip.
 * @param popupProps Tooltip options — positioning, sizing, timing, plus `open`,
 * `icon`, `distance`, `autoFit`, `messageElementStyle`, etc.
 */
const withTooltip = <TProps extends object>(
  Component: ComponentType<TProps>,
  Message: ReactNode,
  popupProps: WithTooltipOptions = {},
): FC<TProps> => {
  const WrappedComponent = (props: TProps): ReactElement<TProps> => {
    return (
      <TooltipEngine Message={Message} {...popupProps}>
        <Component {...props} />
      </TooltipEngine>
    );
  };

  // Set the displayName for easier debugging
  WrappedComponent.displayName = `withTooltip(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
};

/**
 * @implements ds:global.component.tooltip_wrapper
 */
export default withTooltip;
