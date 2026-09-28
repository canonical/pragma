import type { Attachment } from "svelte/attachments";
import type { HTMLDialogAttributes } from "svelte/elements";

/**
 * Emulates the `closedby` attribute on dialogs in browsers that don't support it.
 *
 * Webkit doesn't support `closedby` attribute on dialog elements (https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/closedBy).
 * TODO(closedby): Remove this fallback when Webkit supports it.
 */
export function closedByFallbackAttachment(
  closedby: HTMLDialogAttributes["closedby"],
): Attachment<HTMLDialogElement> {
  return (dialogEl) => {
    if ("closedBy" in HTMLDialogElement.prototype) return;

    // Backdrop hits target the dialog itself but land outside its border box.
    const isOnBackdrop = (e: PointerEvent) => {
      if (e.target !== dialogEl) return false;
      const rect = dialogEl.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };

    let isPointerDownOnBackdrop = false;

    const controller = new AbortController();
    const { signal } = controller;

    // Listen on the document so presses outside the dialog also reset the flag.
    document.addEventListener(
      "pointerdown",
      (e) => {
        isPointerDownOnBackdrop = isOnBackdrop(e);
      },
      { capture: true, signal },
    );

    dialogEl.addEventListener(
      "pointerup",
      (e) => {
        const isLightDismiss =
          closedby === "any" && isPointerDownOnBackdrop && isOnBackdrop(e);
        isPointerDownOnBackdrop = false;
        // Light dismiss is a close request, so it fires a cancelable `cancel` first.
        if (
          isLightDismiss &&
          dialogEl.dispatchEvent(new Event("cancel", { cancelable: true }))
        ) {
          dialogEl.close();
        }
      },
      { signal },
    );

    // Natively, `closedby="none"` doesn't fire `cancel` at all.
    dialogEl.addEventListener(
      "cancel",
      (e) => {
        if (closedby !== "none") return;
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      { capture: true, signal },
    );

    return () => controller.abort();
  };
}
