import type {
  ComponentType,
  FC,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";
import type { UsePopupProps } from "../hooks/index.js";
import { TooltipArea } from "./common/TooltipArea/index.js";

/**
 * A higher-order component that wraps a component with a tooltip.
 * @param Component The component function to wrap. If you need to use a Node instead of a function, use [`TooltipArea`](/?path=/docs/tooltip-withtooltip--docs) instead.
 * @param Message The content of the tooltip
 * @param popupProps The props to pass to the usePopup hook
 */
const withTooltip = <TProps extends object>(
  Component: ComponentType<TProps>,
  Message: ReactNode,
  popupProps: UsePopupProps = {},
): FC<TProps> => {
  const WrappedComponent = (
    props: TProps,
    ref?: RefObject<HTMLElement>,
  ): ReactElement<TProps> => {
    return (
      <TooltipArea Message={Message} {...popupProps}>
        <Component {...props} ref={ref} />
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
