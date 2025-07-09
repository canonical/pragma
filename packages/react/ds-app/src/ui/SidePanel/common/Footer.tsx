import classnames from "classnames";
import type { FC, PropsWithChildren } from "react";

export interface FooterProps {
  className?: string;
  key?: string;
}

const Footer: FC<PropsWithChildren & FooterProps> = ({
  children,
  className,
}) => {
  return (
    <div className={classnames("panel-footer", className)} id="panel-footer">
      <hr />
      {children}
    </div>
  );
};

export default Footer;
