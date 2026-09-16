import { memo, type ReactElement, useContext } from "react";
import { MessagesContext } from "../../../../common/index.js";
import { listNiceTicks } from "../../../../utils/index.js";
import type { RangeDrawingProps } from "./types.js";

const componentCssClassName = "chart";

/**
 * The drawing's own units. It scales to the width it is given, text included:
 * a prototype's geometry, not a layout, recorded as a finding in the recipe.
 */
const WIDTH = 480;
const HEIGHT = 72;
const INSET = 24;
const AXIS_Y = 44;
const BAND = 8;
const MARKER = 5;
const TICKS = 5;

/** How much room an end label needs before it is anchored the other way. */
const LABEL_ROOM = 24;

/**
 * The size the drawing's own text is set in, in the drawing's units, written
 * on the text rather than inherited so the drawing's geometry and its type
 * are pinned together.
 */
const TEXT_SIZE = 12;

/** A coordinate as the drawing writes it: rounded, so no float tail is drawn. */
const place = (value: number): number => Number(value.toFixed(2));

function RangeDrawing({
  label,
  min,
  max,
  lowerBound,
  upperBound,
}: RangeDrawingProps): ReactElement {
  const messages = useContext(MessagesContext);
  const { ticks, low, high } = listNiceTicks(
    Math.min(lowerBound ?? min, min),
    Math.max(upperBound ?? max, max),
    TICKS,
  );
  const scale = (value: number): number =>
    place(INSET + ((value - low) / (high - low)) * (WIDTH - INSET * 2));
  return (
    <>
      <svg
        className={componentCssClassName}
        role="img"
        aria-label={messages.rangeChartSummary(label, min, max)}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        fontSize={TEXT_SIZE}
      >
        <line
          className="axis"
          x1={INSET}
          x2={WIDTH - INSET}
          y1={AXIS_Y}
          y2={AXIS_Y}
        />
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="axis"
              x1={scale(tick)}
              x2={scale(tick)}
              y1={AXIS_Y}
              y2={AXIS_Y + 4}
            />
            <text
              className="tick"
              x={scale(tick)}
              y={AXIS_Y + 16}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {tick}
            </text>
          </g>
        ))}
        <rect
          className="band"
          x={scale(min)}
          y={AXIS_Y - BAND / 2}
          width={place(scale(max) - scale(min))}
          height={BAND}
        />
        {[min, max].map((value, position) => (
          <g key={position === 0 ? "lowest" : "highest"}>
            <circle
              className="marker"
              cx={scale(value)}
              cy={AXIS_Y}
              r={MARKER}
            />
            <text
              className="value"
              x={scale(value)}
              y={AXIS_Y - 16}
              // Held inside the drawing: an end near the edge takes the
              // anchor that keeps its label on the axis.
              textAnchor={
                position === 0
                  ? scale(value) < INSET + LABEL_ROOM
                    ? "start"
                    : "end"
                  : scale(value) > WIDTH - INSET - LABEL_ROOM
                    ? "end"
                    : "start"
              }
            >
              {value}
            </text>
          </g>
        ))}
      </svg>
      <table className="data">
        <caption>{messages.chartTable(label)}</caption>
        <tbody>
          <tr>
            <th scope="row">{messages.chartLowest}</th>
            <td>{min}</td>
          </tr>
          <tr>
            <th scope="row">{messages.chartHighest}</th>
            <td>{max}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

/**
 * A range as a band on a labelled axis, its two ends marked and named — and
 * the same two values as a native table, so nothing is carried by the drawing
 * alone.
 *
 * Memoised, and the chart holds its facet at one reference while it claims
 * the same, so a result that moved another field's facet redraws nothing
 * here.
 */
export default memo(RangeDrawing);
