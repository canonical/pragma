import type React from "react";
import type { RefObject } from "react";
import type { SidePanelProviderProps } from "../types.js";

/**
 * The props the dialog hook receives: every SidePanel prop except `children`,
 * which the provider renders itself rather than handing to the hook.
 */
export type UseSidePanelDialogProps = Omit<SidePanelProviderProps, "children">;

/**
 * What the dialog hook hands back. Helpers and plumbing only — the hook holds
 * no open state of its own; the source of truth is the dialog's native state
 * on an uncontrolled panel and the `open` prop on a controlled one.
 */
export type UseSidePanelDialogResult = {
  /** The consumer's class name, for the provider to merge with its own. */
  className: string | undefined;
  /** Close the panel — the same action the imperative handle exposes. */
  close: () => void;
  /** Every remaining native dialog attribute, spread onto the element. */
  dialogProps: Omit<
    UseSidePanelDialogProps,
    "onKeyDown" | "onClose" | "ref" | "className" | "open" | "onOpenChange"
  >;
  /** The dialog the provider renders; open/close run through it. */
  dialogRef: RefObject<HTMLDialogElement | null>;
  /**
   * The value of the `open` attribute the provider renders, captured from
   * the first render: it paints a controlled panel open in server-rendered
   * markup and never changes afterwards — post-mount the dialog's state is
   * written only through `show()`/`close()`.
   */
  initiallyOpen: boolean;
  /** Keydown wiring: consumer handler first, then Escape dismissal. */
  handleKeyDown: (event: React.KeyboardEvent<HTMLDialogElement>) => void;
  /** The dialog's `close` event funnels here, whatever caused it. */
  handleClose: (event: React.SyntheticEvent<HTMLDialogElement>) => void;
};
