import type React from "react";
import type { ExplorerStatusProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds explorer-status";

/**
 * The explorer's status figure — the mode strip's `status` socket
 * (`slot.explorer-status`).
 *
 * It answers the question the exhibit's maturity bar answers ("how much of
 * this model am I looking at?") using the only quantity this ontology
 * genuinely supports: how many classes the current filter shows, out of
 * how many exist, and how many of those are abstract. Every number is
 * counted from the same graph data the well draws — nothing is asserted
 * that the store does not hold.
 *
 * The bar is proportion, not decoration: its width IS visible/total, and
 * the same ratio is stated in words beside it, so the figure never depends
 * on reading a coloured bar. `aria-live="polite"` announces the change
 * when chips move the count, which is the whole point of putting it in the
 * strip rather than in the canvas.
 */
const ExplorerStatus = ({
  className,
  visible,
  total,
  abstract,
}: ExplorerStatusProps): React.ReactElement => {
  // Guard the degenerate graph so the bar never computes NaN.
  const share = total === 0 ? 0 : Math.round((visible / total) * 100);

  return (
    <figure
      aria-live="polite"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
      data-slot="explorer-status"
    >
      <div
        aria-hidden="true"
        className="explorer-status-bar"
        // The one inline style in the lens: a computed proportion cannot
        // live in a stylesheet. It is a width, not a colour or a layout
        // rule, so the stylesheet still owns every visual decision.
        style={
          { "--explorer-status-share": `${share}%` } as React.CSSProperties
        }
      >
        <span className="explorer-status-fill" />
      </div>
      <figcaption>
        {visible} of {total} classes
        {abstract > 0 ? ` · ${abstract} abstract` : ""}
      </figcaption>
    </figure>
  );
};

export default ExplorerStatus;
