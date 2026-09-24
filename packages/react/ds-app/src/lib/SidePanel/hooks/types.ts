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
 * no open state, so there is no state object to return; the dialog's native
 * state is the only source of truth.
 */
export type UseSidePanelDialogResult = {
  /** The consumer's class name, for the provider to merge with its own. */
  className: string | undefined;
  /** Every remaining native dialog attribute, spread onto the element. */
  dialogProps: Omit<
    UseSidePanelDialogProps,
    | "disableEscapeClose"
    | "onKeyDown"
    | "onClose"
    | "onOpenChange"
    | "ref"
    | "className"
  >;
  /** The dialog the provider renders; open/close run through it. */
  dialogRef: RefObject<HTMLDialogElement | null>;
  /** Keydown wiring: consumer handler first, then Escape dismissal. */
  handleKeyDown: (event: React.KeyboardEvent<HTMLDialogElement>) => void;
  /** The dialog's `close` event funnels here, whatever caused it. */
  handleClose: (event: React.SyntheticEvent<HTMLDialogElement>) => void;
};
