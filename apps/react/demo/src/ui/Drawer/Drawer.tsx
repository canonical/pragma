/* @canonical/generator-ds 0.9.0-experimental.12 */
import type { ReactElement } from "react";
import type { DrawerProps } from "./types.js";
import "./styles.css";
import useDrawer from "./useDrawer.js";

const componentCssClassName = "ds drawer";
/**
 * description of the Drawer component
 * @returns {React.ReactElement} - Rendered Drawer
 */
const Drawer = ({
  id,
  style,
  className,
  children,
  isOpenOverride,
  onClose,
  onOpen,
  position = "right",
  title,
  titleId,
  contentsClassName,
  parent,
}: DrawerProps): ReactElement => {
  const { isOpen, close, dialogueRef } = useDrawer({
    isOpenOverride,
    onClose,
    onOpen,
    parent,
  });

  return (
    <div
      className={[componentCssClassName, className, "overlay", isOpen && "open"]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!isOpen}
    >
      <dialog
        id={id}
        ref={dialogueRef}
        className={`dialogue ${position}`}
        style={style}
        aria-modal="true"
        aria-hidden={!isOpen}
        aria-labelledby={titleId}
      >
        <div className="header">
          {title && (
            <h2 id={titleId} className="title">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={close}
            className="close"
            aria-label={title ? `Close ${title}` : "Close Drawer"}
          >
            &times;
          </button>
        </div>

        <div
          className={["contents", contentsClassName].filter(Boolean).join(" ")}
        >
          {children}
        </div>
      </dialog>
    </div>
  );
};

export default Drawer;
