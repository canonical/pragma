/* @canonical/generator-ds 0.9.0-experimental.20 */
import type { Snippet } from "svelte"

export type AwesomeButtonProps = {
  /** A unique identifier for the Button */
  id?: string | undefined | null;
  /** Additional CSS classes */
  class?: string | undefined | null;
  /** Child elements */
  children?: Snippet | undefined | null;
  /** Inline styles */
  style?: string | undefined | null;
}