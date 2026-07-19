import type { CSSProperties, MouseEvent, ReactElement } from "react";
import {
  CHIP_CSS_CLASS_NAME,
  DEFAULT_BOX,
  DEFAULT_LIFECYCLE,
} from "./constants.js";
import {
  assertNonEmptyString,
  buildChipChannelStyle,
  deriveNamespaceFromUri,
} from "./encodings.js";
import type { ChipProps } from "./types.js";
import "./styles.css";

/**
 * An inline mention of a graph entity — the docsite's sole ambient mechanism
 * for naming things the knowledge graph knows about.
 *
 * A chip is a mention, not the entity itself: `uri` is its identity and the
 * decoration is derived, per the four orthogonal channels in `encodings.ts`
 * (tint → namespace, border-vs-fill → class/instance, shape → kind, dot →
 * lifecycle). Every channel arrives as a CSS custom property, so themes can
 * restyle chips without touching this logic, and with styling ignored the
 * chip degrades to its label as plain running text — chips never block the
 * reading path.
 *
 * With an `href` (see `resolveChipHref` for the default landing map) the chip
 * is a real link to the noun's canonical home; without one it is inert text.
 */
const Chip = ({
  uri,
  label,
  kind,
  namespace,
  box = DEFAULT_BOX,
  lifecycle = DEFAULT_LIFECYCLE,
  href,
  onNavigate,
  summary,
  className,
}: ChipProps): ReactElement => {
  // Props cross the content boundary (MDX, graph data) — fail loudly here.
  assertNonEmptyString(uri, "uri");
  assertNonEmptyString(label, "label");

  const resolvedNamespace = namespace ?? deriveNamespaceFromUri(uri);
  const sharedProps = {
    className: [CHIP_CSS_CLASS_NAME, className].filter(Boolean).join(" "),
    // The channel payloads; typed as ChipChannelStyle, cast for React's
    // style prop (custom properties pass through to setProperty).
    style: buildChipChannelStyle({
      namespace: resolvedNamespace,
      kind,
      box,
      lifecycle,
    }) as CSSProperties,
    // The v1 definition peek. `title` (not aria-describedby to a hidden
    // node) keeps the surrounding text's textContent equal to the visible
    // prose — the reads-as-text invariant.
    title: summary,
    // Identity and channel values as data attributes, for tooling, tests
    // and the stylesheet's structural selectors (e.g. hiding the dot).
    "data-uri": uri,
    "data-namespace": resolvedNamespace,
    "data-kind": kind,
    "data-box": box,
    "data-lifecycle": lifecycle,
  };

  if (href === undefined) {
    return <span {...sharedProps}>{label}</span>;
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    onNavigate?.(uri, event);
  }

  return (
    <a {...sharedProps} href={href} onClick={handleClick}>
      {label}
    </a>
  );
};

export default Chip;
