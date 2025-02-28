import type { ReactElement } from "react";
import { useTooltip } from "./common/hooks/useTooltip/index.js";
import { TooltipMessage, TooltipTrigger } from "./common/index.js";
import type { TooltipProps } from "./types.js";

const Tooltip = ({
  children,
  message,
  ...props
}: TooltipProps): ReactElement => {
  const {
    targetRef,
    messageRef,
    messageStyle,
    messageId,
    isOpen,
    handleTriggerFocus,
    handleTriggerBlur,
    handleTriggerEnter,
    handleTriggerLeave,
  } = useTooltip(props);

  return (
    <>
      <TooltipTrigger
        ref={targetRef}
        messageId={messageId}
        isOpen={isOpen}
        onFocus={handleTriggerFocus}
        onBlur={handleTriggerBlur}
        onPointerEnter={handleTriggerEnter}
        onPointerLeave={handleTriggerLeave}
      >
        {children}
      </TooltipTrigger>

      <TooltipMessage ref={messageRef} style={messageStyle} isOpen={isOpen}>
        {message}
      </TooltipMessage>
    </>
  );
};

export default Tooltip;
