import classnames from "classnames";
import type { FC, PropsWithChildren } from "react";

export interface StickyProps {
  className?: string;
  key?: string;
}

const Sticky: FC<PropsWithChildren & StickyProps> = ({
  children,
  className,
}) => {
  return (
    <div className={classnames("sticky-wrapper", className)}>{children}</div>
  );
};

export default Sticky;
