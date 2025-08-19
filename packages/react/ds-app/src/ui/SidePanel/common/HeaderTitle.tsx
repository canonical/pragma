import classnames from "classnames";
import type { FC, PropsWithChildren } from "react";

export interface HeaderTitleProps {
  className?: string;
  key?: string;
}

const HeaderTitle: FC<PropsWithChildren & HeaderTitleProps> = ({
  children,
  className,
  key,
}) => {
  return (
    <h2 className={classnames("p-panel__title", className)} key={key}>
      {children}
    </h2>
  );
};

export default HeaderTitle;
