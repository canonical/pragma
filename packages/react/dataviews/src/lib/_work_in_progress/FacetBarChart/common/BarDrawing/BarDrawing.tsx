import { memo, type ReactElement, useContext } from "react";
import { MessagesContext } from "../../../../common/index.js";
import { listNiceTicks, spellCount } from "../../../../utils/index.js";
import type { BarDrawingProps, DrawnValue } from "./types.js";

const componentCssClassName = "chart";

/**
 * The drawing's own units. It scales to the width it is given, text included:
 * a prototype's geometry, not a layout, recorded as a finding in the recipe.
 */
const WIDTH = 480;
const LABEL_WIDTH = 136;
const VALUE_WIDTH = 80;
const BAND = 28;
const BAR = 16;
const AXIS = 24;
const RADIUS = 4;
const TICKS = 4;

/**
 * The size the drawing's own text is set in, in the drawing's units, and
 * about how wide one character of it is. The size is written on the text
 * rather than inherited, so the estimate below cannot drift from the type it
 * estimates; the width is a guess from the count of characters, because
 * nothing here lays text out. A real chart measures it, which is recorded as
 * a finding in the recipe.
 */
const TEXT_SIZE = 12;
const CHARACTER_WIDTH = TEXT_SIZE * 0.6;

/** A coordinate as the drawing writes it: rounded, so no float tail is drawn. */
const place = (value: number): number => Number(value.toFixed(2));

/** A bar growing from the baseline, its data end rounded and its base square. */
const spellBarPath = (x0: number, x1: number, y: number): string => {
  const length = x1 - x0;
  if (length <= RADIUS) {
    return `M${x0} ${y}H${x1}V${y + BAR}H${x0}Z`;
  }
  return [
    `M${x0} ${y}`,
    `H${x1 - RADIUS}`,
    `Q${x1} ${y} ${x1} ${y + RADIUS}`,
    `V${y + BAR - RADIUS}`,
    `Q${x1} ${y + BAR} ${x1 - RADIUS} ${y + BAR}`,
    `H${x0}Z`,
  ].join("");
};

/** A value's count as a number to draw, where the source counted it. */
const readDrawnCount = (entry: DrawnValue): number | null =>
  entry.count.kind === "unknown" ? null : entry.count.value;

function BarDrawing({ label, values }: BarDrawingProps): ReactElement {
  const messages = useContext(MessagesContext);
  const largest = Math.max(
    0,
    ...values.map((entry) => readDrawnCount(entry) ?? 0),
  );
  // Records are counted in whole numbers, so the axis steps in them too.
  const { ticks, high: domain } = listNiceTicks(
    0,
    Math.max(largest, TICKS),
    TICKS,
  );
  const plot = WIDTH - LABEL_WIDTH - VALUE_WIDTH;
  const scale = (count: number): number =>
    place(LABEL_WIDTH + (count / domain) * plot);
  const height = values.length * BAND + AXIS;
  return (
    <>
      <svg
        className={componentCssClassName}
        role="img"
        aria-label={messages.barChartSummary(label)}
        viewBox={`0 0 ${WIDTH} ${height}`}
        fontSize={TEXT_SIZE}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="grid-line"
              x1={scale(tick)}
              x2={scale(tick)}
              y1={0}
              y2={values.length * BAND}
            />
            <text
              className="tick"
              x={scale(tick)}
              y={values.length * BAND + AXIS / 2}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {tick}
            </text>
          </g>
        ))}
        {values.map((entry, position) => {
          const top = position * BAND + (BAND - BAR) / 2;
          const drawn = readDrawnCount(entry);
          const end = scale(drawn ?? 0);
          const spelled =
            spellCount(entry.count, messages) ?? messages.countUnknown;
          // Anchored to the far edge where its label would not fit past the
          // bar's tip, so no count is drawn off the chart.
          const overflows =
            spelled.length * CHARACTER_WIDTH > WIDTH - (end + 6);
          return (
            <g key={String(entry.value)}>
              <text
                className="label"
                x={LABEL_WIDTH - 8}
                y={top + BAR / 2}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {String(entry.value)}
              </text>
              {drawn === null || drawn === 0 ? null : (
                <path className="bar" d={spellBarPath(LABEL_WIDTH, end, top)} />
              )}
              <text
                className="value"
                x={overflows ? WIDTH - 4 : end + 6}
                textAnchor={overflows ? "end" : "start"}
                y={top + BAR / 2}
                dominantBaseline="middle"
              >
                {spelled}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="data">
        <caption>{messages.chartTable(label)}</caption>
        <thead>
          <tr>
            <th scope="col">{messages.chartValue}</th>
            <th scope="col">{messages.chartCount}</th>
          </tr>
        </thead>
        <tbody>
          {values.map((entry) => (
            <tr key={String(entry.value)}>
              <th scope="row">{String(entry.value)}</th>
              <td>
                {spellCount(entry.count, messages) ?? messages.countUnknown}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/**
 * One field's values as bars, each as long as the number of records holding
 * it, on an axis of whole records — and the same numbers as a native table,
 * so nothing is carried by the drawing alone.
 *
 * Memoised, and the chart holds its facet at one reference while it claims
 * the same, so a result that moved another field's facet redraws nothing
 * here.
 */
export default memo(BarDrawing);
