import type { HTMLButtonAttributes } from "svelte/elements";

/**
 * Props for the Modal.Header.CloseButton subcomponent
 */
// TODO(button): Derive from the DS Button props once available.
export type CloseButtonProps = Omit<HTMLButtonAttributes, "children">;
