import type { MouseEvent } from "react";
import type { Box, Kind, Lifecycle, Namespace } from "./encodings.js";

export interface ChipProps {
  /**
   * The graph URI the mention resolves to — the chip's identity, invariant
   * wherever the same entity is mentioned. E.g. `ds:global.component.button`.
   */
  readonly uri: string;
  /** Visible text. Ignored decoration aside, the chip reads as this text. */
  readonly label: string;
  /** Entity family — drives the shape channel. */
  readonly kind: Kind;
  /**
   * Namespace — drives the tint channel. Defaults to the URI's prefix, so it
   * only needs stating when the mention should override its own URI.
   */
  readonly namespace?: Namespace;
  /**
   * TBox class vs ABox instance — drives the border-vs-fill channel.
   * Defaults to `instance`: a mention names a thing unless it says otherwise.
   */
  readonly box?: Box;
  /** Lifecycle — drives the status-dot channel. Defaults to `none` (no dot). */
  readonly lifecycle?: Lifecycle;
  /**
   * Landing URL (see `resolveChipHref` for the default map). With an href the
   * chip renders an `<a>`; without one it renders a non-interactive `<span>`.
   */
  readonly href?: string;
  /**
   * Click callback for router integration, called with the chip's URI before
   * the browser follows `href` (call `event.preventDefault()` to take over).
   * Only fires on the anchor form — a chip without an href stays inert.
   * Future router adapter: `onNavigate` implementations should check
   * `event.metaKey`/`ctrlKey`/`shiftKey`/`button !== 0` before calling
   * `preventDefault()`, so modified clicks keep their native behaviour
   * (new tab, new window, download).
   */
  readonly onNavigate?: (
    uri: string,
    event: MouseEvent<HTMLAnchorElement>,
  ) => void;
  /**
   * One-line definition exposed as the chip's `aria-description` (with the
   * lifecycle folded in when asserted) and echoed as a native `title` hover
   * peek — the full definition peek is a later component. Both are string
   * attributes, so the chip still reads as plain text.
   */
  readonly summary?: string;
  /** Additional CSS classes. */
  readonly className?: string;
}

export interface ChipLegendProps {
  /** Additional CSS classes. */
  readonly className?: string;
}
