import { Button } from "@canonical/react-ds-global";
import type { ReactNode } from "react";
import { FormProvider, useForm } from "react-hook-form";
import Field from "../../pattern/Field/Field.js";
import { SpikeBox, SpikeRows } from "./mocks.js";
import "./density.testbed.css";

/**
 * Baseline-alignment spike harness (WORK IN PROGRESS)
 *
 * Line-based: each bucket renders as ONE horizontal line (its own story), with
 * a few letters of paragraph-style text at the start (the baseline reference)
 * followed by the components inline. No cards, no labels. The 4px baseline grid
 * is supplied by the styles-debug plugin (story parameter).
 */

/** react-hook-form context so real Field components render inline. */
const FormShell = ({ children }: { children: ReactNode }) => {
  const methods = useForm({ mode: "onChange" });
  return (
    <FormProvider {...methods}>
      <form
        className="ds form"
        onSubmit={methods.handleSubmit(() => {})}
        style={{ display: "contents" }}
      >
        {children}
      </form>
    </FormProvider>
  );
};

/**
 * A bucket = one line: the short prose prefix `lead`, then the inline components.
 * `anchored` makes the `.p` lead the height/baseline anchor and shrinks the
 * controls so the paragraph — not a control — determines the line's alignment.
 */
const Line = ({
  lead,
  anchored,
  children,
}: {
  lead: string;
  anchored?: boolean;
  children: ReactNode;
}) => (
  <div className="density-testbed">
    <div
      className={[
        "density-testbed__line",
        anchored ? "density-testbed__line--anchored" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="p density-testbed__lead">{lead}</p>
      {children}
    </div>
  </div>
);

/** Controls bucket — buttons + inputs on one line, anchored to the `.p` lead. */
export const ControlsLine = () => (
  <Line lead="Sample" anchored>
    <SpikeBox as="button">Sa</SpikeBox>
    <SpikeBox>Va</SpikeBox>
    <Button importance="primary">Re</Button>
    <Button importance="secondary">Se</Button>
    <FormShell>
      <Field inputType="text" name="n" placeholder="In" />
    </FormShell>
  </Line>
);

/** Navigation bucket — tab / side-nav items on one line. */
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
