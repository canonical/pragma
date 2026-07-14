import { Button } from "@canonical/react-ds-global";
import type { ReactNode } from "react";
import { Label } from "../../subcomponent/Field/Label/index.js";
import { TextInput } from "../../subcomponent/TextInput/index.js";
import { SpikeBox, SpikeRows } from "./mocks.js";
import "./density.testbed.css";
import "./baseline-system.css";

/**
 * Baseline-alignment spike harness (WORK IN PROGRESS)
 *
 * Line-based: each bucket renders as ONE horizontal line (its own story), with
 * a few letters of paragraph-style text at the start (the baseline reference)
 * followed by the components inline. No cards, no labels. The 4px baseline grid
 * is supplied by the styles-debug plugin (story parameter).
 */

/**
 * A bucket = a short prose prefix + the components, laid out inline with the
 * NORMAL component structure (no flattening, no overrides) so what we see is what
 * ships. `align-items: baseline` lines them up; nothing else is customised.
 */
const Line = ({ lead, children }: { lead: string; children: ReactNode }) => (
  <div className="density-testbed">
    <div className="density-testbed__row">
      <p className="p">{lead}</p>
      {children}
    </div>
  </div>
);

/** Controls bucket — real Button + a standalone Label and TextInput (used
 *  separately, so there's no stacked Field grid to flatten). */
export const ControlsLine = () => (
  <Line lead="Sample">
    <Button importance="primary">Re</Button>
    <Button importance="secondary">Se</Button>
    <Label name="n">Label</Label>
    <TextInput name="n" placeholder="In" />
  </Line>
);

/** Navigation bucket — tab / side-nav item stand-ins on one line. */
export const NavigationLine = () => (
  <Line lead="Ov">
    <SpikeBox>Ov</SpikeBox>
    <SpikeBox>In</SpikeBox>
    <SpikeBox>St</SpikeBox>
    <SpikeBox>Ne</SpikeBox>
  </Line>
);

/** Lists bucket — list/table rows (shared border) on one line. */
export const ListsLine = () => (
  <Line lead="Ro">
    <SpikeRows rows={["n1", "n2", "n3"]} />
  </Line>
);

const PROSE =
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen " +
  "liquor jugs, and watch how each line of real prose seats itself on the 4px " +
  "baseline grid as the size changes.";

/** The real typography tiers the engine styles — h1..h6 + p (mapper.css). No
 *  custom size classes: each tag IS its tier. */
const TIERS = ["h1", "h2", "h3", "h4", "h5", "h6", "p"] as const;

/**
 * Typography bucket — pure engine output, using the package's own tags (h1..h6,
 * p). First an inline row of each tier side by side (to compare their baselines),
 * then full stacked paragraphs of each tier (to witness how a real prose block
 * of each tier sits on the 4px grid).
 */
export const TypographyLine = () => (
  <div className="density-testbed">
    <div className="density-testbed__type">
      {TIERS.map((Tag) => (
        <Tag key={Tag}>The quick brown fox</Tag>
      ))}
    </div>

    <div className="density-testbed__prose">
      {TIERS.map((Tag) => (
        <Tag key={Tag}>{PROSE}</Tag>
      ))}
    </div>
  </div>
);

/** Deliberately off-scale sizes — none is a tier. Each is only a `.baseline`
 *  element with an inline font-size; if they all seat on the grid, `.baseline`
 *  is genuinely size-agnostic (DS.01). */
const OFF_SCALE = [19, 27, 35, 43, 53, 61];

/**
 * DS.01 proof — the size-agnostic `.baseline` class. A row of arbitrary,
 * off-scale font sizes, each snapped to the 4px grid by `.baseline` alone (no
 * tier, no engine size class). The tags h1..h6/p are untouched and still nudge
 * by default — this is additive.
 */
export const BaselineProofLine = () => (
  <div className="density-testbed">
    <div className="baseline-proof">
      {OFF_SCALE.map((px) => (
        <span key={px} className="baseline" style={{ fontSize: `${px}px` }}>
          {px}px
        </span>
      ))}
    </div>
  </div>
);

/** Mixed sizes in the density box, at both densities. Kept within what a dense
 *  (24px) / comfortable (32px) line-height can hold without clipping. */
const BOXED_SIZES = [16, 18, 20, 22];

/**
 * DS.02 proof — `.spike-baseline-boxed` (PROTOTYPE, not core API). Two density
 * line-heights: dense (24px) and comfortable (32px). Each box snaps to the grid
 * via the existing start/end nudge; top-referenced, so the boxes share the top
 * rhythm (a fixed baseline-from-bottom is NOT what the existing calc produces).
 */
export const BoxedProofLine = () => (
  <div className="density-testbed">
    {(["is-dense", "is-comfortable"] as const).map((density) => (
      <div key={density} className={`boxed-proof ${density}`}>
        {BOXED_SIZES.map((px) => (
          <span
            key={px}
            className="baseline spike-baseline-boxed"
            style={{ fontSize: `${px}px` }}
          >
            {px}
          </span>
        ))}
      </div>
    ))}
  </div>
);
