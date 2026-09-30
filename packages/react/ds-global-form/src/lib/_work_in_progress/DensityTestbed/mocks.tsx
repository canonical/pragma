import type React from "react";

/**
 * Baseline-alignment spike — boxed-control primitive + mocks (WORK IN PROGRESS)
 *
 * `SpikeBox` is the unit under test: a bordered box whose interior is a single
 * line of `.p`-tier text (a stand-in for a button label, input value, nav-item
 * text or table-cell text). Its seat uses the shipped engine model (the
 * asymmetric start/end nudges from `density.testbed.css`); the alternative
 * external-margin model was dropped, so there is no model toggle. Using one
 * primitive keeps buckets comparing like-for-like; the real Button/inputs are
 * shown alongside in the story for reference.
 */

/** A boxed control: border + a `.p` text seat, seated on the grid by the engine's
 *  start/end nudges (see density.testbed.css). */
export const SpikeBox = ({
  children,
  as = "div",
  role,
}: {
  children: React.ReactNode;
  as?: "div" | "button";
  role?: string;
}): React.ReactElement => {
  const Tag = as;
  return (
    <Tag
      className="spike-box"
      role={role}
      type={as === "button" ? "button" : undefined}
    >
      <span className="seat p">{children}</span>
    </Tag>
  );
};

/** A run of boxed cells sharing one border — the list/table-row case, laid out
 *  inline on the bucket line (the CSS collapses the between-borders). Exercises
 *  how per-cell external margin interacts with a shared border. */
export const SpikeRows = ({ rows }: { rows: string[] }): React.ReactElement => (
  <div className="spike-rows">
    {rows.map((r) => (
      <SpikeBox key={r}>{r}</SpikeBox>
    ))}
  </div>
);
