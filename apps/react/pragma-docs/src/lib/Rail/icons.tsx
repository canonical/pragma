/**
 * The rail's icon set — 16px stroke glyphs adapted from the A.06 exhibit
 * (`docs-shell-prototype.html`), which is the rail's look-and-feel
 * reference. Inline SVG (no asset pipeline), `currentColor`, and always
 * `aria-hidden`: the accessible name is the entry's visible label. The
 * icons are what survives the sanctioned small-viewport collapse (AX.1),
 * so every rail entry must carry one.
 */

import type { ReactElement } from "react";
import type { LensEntry } from "./constants.js";

interface IconProps {
  readonly size?: number;
}

const sharedProps = (size: number) =>
  ({
    fill: "none",
    height: size,
    stroke: "currentColor",
    strokeWidth: 1.6,
    viewBox: "0 0 16 16",
    width: size,
  }) as const;

export const HomeIcon = ({ size = 16 }: IconProps): ReactElement => (
  <svg aria-hidden="true" {...sharedProps(size)}>
    <path d="M2 8.5 8 3l6 5.5M4 7.5V13h8V7.5" />
  </svg>
);

export const ComponentsIcon = ({ size = 16 }: IconProps): ReactElement => (
  <svg aria-hidden="true" {...sharedProps(size)}>
    <rect height="4.6" rx="1" width="4.6" x="2.5" y="2.5" />
    <rect height="4.6" rx="1" width="4.6" x="9" y="2.5" />
    <rect height="4.6" rx="1" width="4.6" x="2.5" y="9" />
    <rect height="4.6" rx="2.3" width="4.6" x="9" y="9" />
  </svg>
);

export const DefinitionsIcon = ({ size = 16 }: IconProps): ReactElement => (
  <svg aria-hidden="true" {...sharedProps(size)}>
    <circle cx="4" cy="4" r="2" />
    <circle cx="12" cy="5" r="2" />
    <circle cx="7" cy="12" r="2" />
    <path d="M5.7 5.2 7 10M6 4.4l4-.2M10.8 6.6 8 10.6" />
  </svg>
);

export const StandardsIcon = ({ size = 16 }: IconProps): ReactElement => (
  <svg aria-hidden="true" {...sharedProps(size)}>
    <path d="M8 2 13 4v4c0 3.2-2.2 5.3-5 6-2.8-.7-5-2.8-5-6V4l5-2z" />
    <path d="M5.8 8l1.6 1.6L10.5 6.5" />
  </svg>
);

export const GuidesIcon = ({ size = 16 }: IconProps): ReactElement => (
  <svg aria-hidden="true" {...sharedProps(size)}>
    <path d="M3 3h7a3 3 0 0 1 3 3v7H6a3 3 0 0 1-3-3V3z" />
    <path d="M6 6h4M6 9h4" />
  </svg>
);

export const PlaygroundIcon = ({ size = 15 }: IconProps): ReactElement => (
  <svg aria-hidden="true" {...sharedProps(size)}>
    <path d="M5 5 2 8l3 3M11 5l3 3-3 3" />
  </svg>
);

export const SignInIcon = ({ size = 15 }: IconProps): ReactElement => (
  <svg aria-hidden="true" {...sharedProps(size)}>
    <circle cx="8" cy="5.5" r="2.5" />
    <path d="M3.5 13.5c.6-2.6 2.3-4 4.5-4s3.9 1.4 4.5 4" />
  </svg>
);

/** The lens → glyph pairing, keyed by route name. */
export const LENS_ICONS: Readonly<
  Record<LensEntry["to"], (props: IconProps) => ReactElement>
> = {
  components: ComponentsIcon,
  definitions: DefinitionsIcon,
  guides: GuidesIcon,
  home: HomeIcon,
  standards: StandardsIcon,
};
