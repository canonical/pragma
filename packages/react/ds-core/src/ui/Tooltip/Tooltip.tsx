import type { ReactElement, ReactNode } from "react";
import { withTooltip } from "./common/hooks/index.js";
import type { TooltipProps } from "./types.js";

const Tooltip = ({
  children,
  Message,
  ...props
}: TooltipProps): ReactElement => {
  const TooltipWithHOC = withTooltip(
    ({ children }: { children?: ReactNode }) => <>{children}</>,
    {
      Message: Message,
      ...props,
    },
  );

  return <TooltipWithHOC {...props}>{children}</TooltipWithHOC>;
};

export default Tooltip;
