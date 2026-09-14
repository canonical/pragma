import type { SubmitEvent } from "react";

/**
 * Cancel a GET form's own submission: the edit its controls made has applied
 * already, through the provider, so there is nothing left for the browser to
 * do.
 *
 * @note Impure by design: it cancels the browser's default for the event.
 */
export default function interceptSubmit(
  event: SubmitEvent<HTMLFormElement>,
): void {
  event.preventDefault();
}
