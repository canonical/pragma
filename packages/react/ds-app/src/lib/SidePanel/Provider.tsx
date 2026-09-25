import type React from "react";
import { Children, isValidElement } from "react";
import Context from "./Context.js";
import { Content, Footer, Header } from "./common/index.js";
import { useSidePanelContextValue, useSidePanelDialog } from "./hooks/index.js";
import type { SidePanelProviderProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds side-panel";

/**
 * A panel docked to the inline-end edge of the viewport, for work that
 * accompanies the current view rather than interrupting it.
 *
 * Structurally, the component is a context provider that renders the panel's
 * markup: it wraps the `<dialog>` in the context its composed parts read,
 * and keeps every piece of panel behaviour — open/close bookkeeping, focus
 * handoff, the imperative handle — in `useSidePanelDialog`, with the context
 * value itself built by `useSidePanelContextValue`.
 *
 * It renders a **non-modal** `<dialog>` opened with `show()`, so the
 * application behind stays clickable and tabbable.
 *
 * The panel is controlled through its `ref`: `open()` shows it and moves focus
 * in, `close()` hides it and hands focus back. The ref is required, since the
 * handle is the only way in — a panel with no ref is a panel that can never
 * open. The dialog's native open state is the single source of truth — there
 * is no `open` prop to mirror it.
 *
 * The panel forwards the native dialog `onClose`: pass your own to hear about
 * every close, whatever caused it — the handle's `close()`, Escape, or anything else.
 *
 * Compose the body from `SidePanel.Header`, `SidePanel.Content` and
 * `SidePanel.Footer`. The panel lays them out as a flex column: header and
 * footer keep their size, and the content pane takes the rest and scrolls
 * within it. The content pane is a tab stop, so keyboard users can scroll it;
 * opening the panel still focuses the panel itself, so from there Tab reaches
 * the close button, then the content, then the footer's actions.
 *
 * There are two consumption patterns, `withSidePanel` and `SidePanel`.
 * `withSidePanel` is meant for static content: the call belongs at module
 * scope, where the function it is handed can only see module-level values, so
 * the panel it returns is the same on every render. If the panel must show
 * data from the parent — for example a different machine's details depending
 * on which machine is selected — compose `SidePanel` directly and drive it
 * through its `ref`. Otherwise, use `withSidePanel`.
 *
 * The panel is always named by its header's title, so the header is required
 * — a panel composed without one gets a development warning. Note the title
 * is not a heading element: the panel is a layer on top of the page, not
 * part of its document outline.
 *
 * The panel is `position: fixed` and therefore out of the document flow: an
 * `overflow: hidden` ancestor does not clip it
 *
 * Because the content pane is a scroll container, the panel clips its own
 * overflow, and the panel is offset with a transform, the panel both clips and
 * re-anchors its descendants: an overlay that needs to escape its box — a
 * `Popover` or `ContextualMenu`, whose content is `position: fixed` — is cut
 * off at the content pane's edge and positioned against the panel rather than
 * the viewport. Keep such overlays inside the content pane's bounds, or render
 * them outside the panel.
 *
 * `import { SidePanel } from "@canonical/react-ds-app";`
 *
 * @implements ds:apps.pattern.side_panel
 */
const Provider = ({
  children,
  ...props
}: SidePanelProviderProps): React.ReactElement => {
  const { className, dialogProps, dialogRef, handleKeyDown, handleClose } =
    useSidePanelDialog(props);
  const contextValue = useSidePanelContextValue(dialogRef);

  // The header is required: its title is the panel's accessible name, and a
  // panel without one cannot be named. Direct children only — a Header wrapped
  // in a fragment escapes this check, and the warning is a nudge, not a gate.
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV !== "production" &&
    !Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === Header,
    )
  ) {
    console.warn(
      "SidePanel: the panel needs a SidePanel.Header — its title is the panel's accessible name.",
    );
  }

  return (
    <Context.Provider value={contextValue}>
      <dialog
        ref={dialogRef}
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        // The panel is always named by its header's title — the header is
        // required, so this always points at a live element (the development
        // warning above catches panels composed without one). A consumer
        // `aria-label` still reaches the element through the spread, but
        // `aria-labelledby` wins the accessible-name computation, so the
        // title's word is final.
        aria-labelledby={contextValue.titleId}
        // Focusable so that opening can place focus on the panel itself.
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClose={handleClose}
        {...dialogProps}
      >
        {children}
      </dialog>
    </Context.Provider>
  );
};

Provider.Content = Content;
Provider.Footer = Footer;
Provider.Header = Header;

export default Provider;
