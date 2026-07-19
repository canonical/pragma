import type { ReactElement } from "react";
import Chip from "./Chip.js";
import {
  DEFAULT_BOX,
  DEFAULT_LIFECYCLE,
  DEFAULT_NAMESPACE,
  LEGEND_CSS_CLASS_NAME,
} from "./constants.js";
import {
  BOX_ENCODINGS,
  CHANNEL_DESCRIPTORS,
  type Channel,
  type ChipChannelValues,
  KIND_ENCODINGS,
  LIFECYCLE_ENCODINGS,
  NAMESPACE_ENCODINGS,
} from "./encodings.js";
import type { ChipLegendProps } from "./types.js";
import "./styles.css";

/**
 * The channel values a swatch holds constant while its own channel varies —
 * so each legend row demonstrates exactly one dimension of the grammar.
 */
const SWATCH_BASELINE: ChipChannelValues = {
  namespace: DEFAULT_NAMESPACE,
  kind: "term",
  box: DEFAULT_BOX,
  lifecycle: DEFAULT_LIFECYCLE,
};

/** One generated legend row: legend copy plus the swatch's channel values. */
interface LegendEntry {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly channels: ChipChannelValues;
}

/**
 * Projects one channel's encoding rows into legend entries. The switch is
 * exhaustive over {@link Channel}, so adding a channel without legend
 * coverage is a compile error.
 */
function listEntriesForChannel(channel: Channel): readonly LegendEntry[] {
  switch (channel) {
    case "namespace":
      return NAMESPACE_ENCODINGS.map((row) => ({
        key: row.value,
        label: row.label,
        description: row.description,
        channels: { ...SWATCH_BASELINE, namespace: row.value },
      }));
    case "box":
      return BOX_ENCODINGS.map((row) => ({
        key: row.value,
        label: row.label,
        description: row.description,
        channels: { ...SWATCH_BASELINE, box: row.value },
      }));
    case "kind":
      return KIND_ENCODINGS.map((row) => ({
        key: row.value,
        label: `${row.label} (${row.shape})`,
        description: row.description,
        channels: { ...SWATCH_BASELINE, kind: row.value },
      }));
    case "lifecycle":
      return LIFECYCLE_ENCODINGS.map((row) => ({
        key: row.value,
        label: row.label,
        description: row.description,
        channels: { ...SWATCH_BASELINE, lifecycle: row.value },
      }));
  }
}

/**
 * The chip legend — generated, never hand-written. Every group and row maps
 * over the same encoding tables `Chip` renders from, and every swatch is a
 * real `Chip` styled through the same channel pipeline, so the legend cannot
 * drift from behaviour: change a row in `encodings.ts` and both the chips in
 * prose and this legend repaint together.
 */
const ChipLegend = ({ className }: ChipLegendProps): ReactElement => (
  <div className={[LEGEND_CSS_CLASS_NAME, className].filter(Boolean).join(" ")}>
    {CHANNEL_DESCRIPTORS.map((channel) => (
      <section aria-label={channel.label} key={channel.value}>
        <p className="chip-legend-title">{channel.label}</p>
        <p className="chip-legend-summary">{channel.description}</p>
        <ul className="chip-legend-entries">
          {listEntriesForChannel(channel.value).map((entry) => (
            <li key={entry.key}>
              {/* The legend mentions the grammar itself — hence docs: URIs. */}
              <Chip
                box={entry.channels.box}
                kind={entry.channels.kind}
                label={entry.label}
                lifecycle={entry.channels.lifecycle}
                namespace={entry.channels.namespace}
                uri={`docs:legend.${channel.value}.${entry.key}`}
              />
              <span className="chip-legend-note">{entry.description}</span>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
);

export default ChipLegend;
