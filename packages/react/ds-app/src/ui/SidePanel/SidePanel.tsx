import classnames from "classnames";
import { FC, PropsWithChildren, ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Spinner from "ui/Spinner/index.js";
import AppAside from "../AppAside/index.js";
import Container, { type ContainerProps } from "./common/Container.js";
import Content, { type ContentProps } from "./common/Content.js";
import Footer, { type FooterProps } from "./common/Footer.js";
import Header, { type HeaderProps } from "./common/Header.js";
import HeaderControls, {
  type HeaderControlsProps,
} from "./common/HeaderControls.js";
import HeaderTitle, { type HeaderTitleProps } from "./common/HeaderTitle.js";
import Sticky, { type StickyProps } from "./common/Sticky.js";

interface SidePanelProps {
  isOverlay?: boolean;
  isSplit?: boolean;
  children: ReactNode;
  loading?: boolean;
  hasError?: boolean;
  className?: string;
  width?: "narrow" | "wide";
  pinned?: boolean;
}

const SidePanelComponent: FC<SidePanelProps> = ({
  children,
  isOverlay,
  isSplit = false,
  loading = false,
  hasError = false,
  className,
  pinned,
  width,
}) => {
  const container = document.getElementById("l-application") || document.body;

  return createPortal(
    <AppAside
      className={classnames(className, {
        "is-split": isSplit,
        "is-overlay": isOverlay,
      })}
      aria-label="Side panel"
      pinned={pinned}
      narrow={width === "narrow"}
      wide={width === "wide"}
    >
      {loading ? (
        <div className="loading">
          <Spinner />
        </div>
      ) : hasError ? (
        "Loading failed"
      ) : (
        children
      )}
    </AppAside>,
    container,
  );
};

type SidePanelComponents = FC<SidePanelProps> & {
  Header: FC<PropsWithChildren & HeaderProps>;
  HeaderTitle: FC<PropsWithChildren & HeaderTitleProps>;
  HeaderControls: FC<PropsWithChildren & HeaderControlsProps>;
  Sticky: FC<PropsWithChildren & StickyProps>;
  Container: FC<PropsWithChildren & ContainerProps>;
  Content: FC<PropsWithChildren & ContentProps>;
  Footer: FC<PropsWithChildren & FooterProps>;
};

const SidePanel = SidePanelComponent as SidePanelComponents;
SidePanel.Header = Header;
SidePanel.HeaderTitle = HeaderTitle;
SidePanel.HeaderControls = HeaderControls;
SidePanel.Sticky = Sticky;
SidePanel.Container = Container;
SidePanel.Content = Content;
SidePanel.Footer = Footer;

export default SidePanel;
