import type React from "react";
import type { ComponentType, FC } from "react";
import { usePopup } from "../../../../hooks/index.js";
import { TooltipMessage } from "../../TooltipMessage/index.js";
import { TooltipTrigger } from "../../TooltipTrigger/index.js";
import type { WithTooltipOpts } from "./types.js";
import "./styles.css";

const withTooltip = <P extends object>(
  Component: ComponentType<P>,
  { Message, ...popupProps }: WithTooltipOpts,
): FC<P> => {
  const WithTooltipComponent = (props: P, ref?: React.Ref<HTMLElement>) => {
    const {
      targetRef,
      popupRef,
      popupPositionStyle,
      popupId,
      isOpen,
      handleTriggerFocus,
      handleTriggerBlur,
      handleTriggerEnter,
      handleTriggerLeave,
    } = usePopup(popupProps);

    return (
      <div className={"ds tooltip"}>
        <TooltipTrigger
          ref={targetRef}
          messageId={popupId}
          isOpen={isOpen}
          onFocus={handleTriggerFocus}
          onBlur={handleTriggerBlur}
          onPointerEnter={handleTriggerEnter}
          onPointerLeave={handleTriggerLeave}
        >
          <Component {...props} ref={ref} />
        </TooltipTrigger>

        <TooltipMessage
          ref={popupRef}
          style={popupPositionStyle}
          isOpen={isOpen}
        >
          {Message}
        </TooltipMessage>
      </div>
    );
  };

  // Set the displayName for easier debugging
  WithTooltipComponent.displayName = `withTooltip(${
    Component.displayName || Component.name || "Component"
  })`;

  return WithTooltipComponent as FC<P>;
};

export default withTooltip;
