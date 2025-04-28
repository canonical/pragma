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
      id={id}
      className={[componentCssClassName, className, "overlay", isOpen && "open"]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-hidden={!isOpen}
    >
      <dialog
        ref={dialogueRef}
        className={`dialogue ${position}`}
        open={isOpen}
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
            // Biome, by default, recommends against using autoFocus, however it seems that this is mainly meant for input elements.
            // See Biome rule: https://biomejs.dev/linter/rules/no-autofocus/
            // MDN recommends using autoFocus on the close button of a dialog to improve accessibility.
            // biome-ignore lint/a11y/noAutofocus: Autofocus the close button per https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
            autoFocus={true}
          >
            &times;
          </button>
        </div>

        <div className="contents">{children}</div>
      </dialog>
    </div>
  );
};

export default Drawer;
