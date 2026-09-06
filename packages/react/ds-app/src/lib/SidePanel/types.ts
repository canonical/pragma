import type { ComponentProps, ReactNode } from "react";

/** The small API a SidePanel threads down to its header, content and footer. */
export interface SidePanelContextValue {
  /** Ask the panel to close. Reports to the consumer; never closes directly. */
  requestClose: () => void;
  /** Id the panel is labelled by. `Header` puts it on its heading. */
  titleId: string;
}

type OwnProps = {
  /** Whether the panel is open. */
  open: boolean;
  /**
   * Called when the panel asks to be closed — the close button, Escape, or an
   * outside press when `closeOnOutsideClick` is enabled.
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Close when Escape is pressed while focus is inside the panel. Defaults to
   * true. Focus outside the panel belongs to the application, so Escape there
   * is deliberately not intercepted.
   */
  closeOnEscape?: boolean;
  /**
   * Close when a pointer press lands outside the panel. Defaults to **false**,
   * unlike a modal dialog: the application behind stays interactive, so a press
   * in it is ordinary work rather than a dismissal gesture. Opt in only where
   * the panel is genuinely transient.
   */
  closeOnOutsideClick?: boolean;
  /**
   * Panel contents. Compose from `SidePanel.Header`, `SidePanel.Content` and
   * `SidePanel.Footer`; the header and footer stay put while the content
   * scrolls.
   */
  children: ReactNode;
};

/**
 * Props for SidePanel.
 *
 * `open` is controlled: the panel mirrors the prop onto the DOM and reports
 * every dismissal request through `onOpenChange`, but never closes itself.
 *
 * Props extend the native props of the `<dialog>` root, so every attribute it
 * accepts (data-*, aria-*, event handlers, …) reaches the DOM. A consumer
 * `ref` is merged with the panel's own dialog ref (which drives show()/close()
 * and the focus hand-back), so both see the element.
 */
export type SidePanelProps = OwnProps &
  Omit<ComponentProps<"dialog">, keyof OwnProps>;
