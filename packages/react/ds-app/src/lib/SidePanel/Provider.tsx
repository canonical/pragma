import type React from "react";
import { Children, isValidElement, useId, useMemo } from "react";
import Context from "./Context.js";
import { Content, Footer, Header } from "./common/index.js";
import { useSidePanelDialog } from "./hooks/index.js";
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
 * handoff, the imperative handle — in `useSidePanelDialog`.
 *
 * It renders a **non-modal** `<dialog>` opened with `show()`, so the
 * application behind stays clickable and tabbable.
 *
 * Uncontrolled by default, and controlled by an `open` prop:
 *
 * - Uncontrolled: the panel is driven through its `ref` — `open()` shows it
 *   and moves focus in, `close()` hides it and hands focus back, `toggle()`
 *   switches between those states. The dialog's native open state is the
 *   single source of truth.
 * - Controlled (`open` passed): the panel renders exactly what the prop
 *   says and never opens or closes on its own; the header's close button and
 *   Escape fire `onOpenChange(false)` for the owner to act on. This is the
 *   server-renderable mode — hold the state in a URL search parameter and
 *   pass it here, and the server paints the panel open on first response.
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
 * There are three ways to consume a panel, and they differ by who drives
 * it:
 *
 * - `withSidePanel` — static content, same every time: one trigger owns the
 *   panel and its exit paths are self-contained.
 * - `SidePanel` driven through its `ref` — content from parent state (a
 *   different machine's details depending on which machine is selected), or
 *   other open/close paths; the panel stays uncontrolled.
 * - `SidePanel` driven through an `open` prop — the state lives outside the
 *   component: a URL search parameter (server-renderable, deep-linkable), or
 *   a parent's selection.
 *
 * The `withSidePanel` call belongs at module scope, where the function it is
 * handed can only see module-level values, so the panel it returns is the
 * same on every render. Otherwise, compose `SidePanel` directly.
 *
 * The panel is always named by its header's title, so the header is required
 * — a panel composed without one gets a development warning. Note the title
 * is not a heading element: the panel is a layer on top of the page, not
 * part of its document outline.
 *
 * The panel is `position: fixed` and therefore out of the document flow: an
 * `overflow: hidden` ancestor does not clip it
 *
 * Because the content pane scrolls and the panel is transformed, a
 * `position: fixed` overlay rendered inside the panel is clipped at the
 * pane's edge and positioned relative to the panel rather than the viewport.
 * `Popover` currently follows that pattern, so keep it within the content
 * pane's bounds.
 *
 * `ContextualMenu` instead portals its surface to `document.body`, escaping
 * this clipping. When it must overlap the panel, give its overlay layer a
 * z-index higher than `--side-panel-z-index`.
 *
 * `import { SidePanel } from "@canonical/react-ds-app";`
 *
 * @implements ds:apps.pattern.side_panel
 */
const Provider = ({
  children,
  ...props
}: SidePanelProviderProps): React.ReactElement => {
  const {
    className,
    close,
    dialogProps,
    dialogRef,
    initiallyOpen,
    handleKeyDown,
    handleClose,
  } = useSidePanelDialog(props);
  // The header's title carries this id, and the dialog is labelled by it.
  const titleId = useId();
  // Memoised so the parts reading the context do not re-render every time
  // the provider does.
  const contextValue = useMemo(() => ({ close, titleId }), [close, titleId]);

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
        // The first render's `open`, frozen for the panel's life: it paints
        // a controlled panel open in server-rendered markup, and afterwards
        // the dialog's state is written only through `show()`/`close()`, so
        // re-renders never fight the imperative state.
        open={initiallyOpen || undefined}
        // The panel is always named by its header's title — the header is
        // required, so this always points at a live element (the development
        // warning above catches panels composed without one). A consumer
        // `aria-label` still reaches the element through the spread, but
        // `aria-labelledby` wins the accessible-name computation, so the
        // title's word is final.
        aria-labelledby={titleId}
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

Provider.displayName = "SidePanel";

export default Provider;
