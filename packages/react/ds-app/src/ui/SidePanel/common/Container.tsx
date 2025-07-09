import type { FC, PropsWithChildren } from "react";
import Panel from "../../Panel/index.js";

export interface ContainerProps {
  className?: string;
  key?: string;
}

const Container: FC<PropsWithChildren & ContainerProps> = ({
  children,
  className,
}) => {
  return <Panel className={className}>{children}</Panel>;
};

export default Container;
