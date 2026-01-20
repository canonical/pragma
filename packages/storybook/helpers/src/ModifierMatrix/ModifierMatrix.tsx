import type { ModifierMatrixProps } from "./types.js";
import "./ModifierMatrix.css";

/**
 * A Storybook helper component that renders a matrix grid showing all combinations
 * of two orthogonal modifier families.
 *
 * This is useful for documenting design system components that support multiple
 * modifier axes (e.g., importance x anticipation for Button).
 *
 * @example
 * ```tsx
 * import { ModifierMatrix, MODIFIER_AXES } from "@canonical/storybook-helpers";
 * import { Button } from "./Button";
 *
 * export const Matrix: Story = {
 *   render: () => (
 *     <ModifierMatrix
 *       component={Button}
 *       rowAxis={MODIFIER_AXES.importance}
 *       columnAxis={MODIFIER_AXES.anticipation}
 *       baseProps={{ children: "Button" }}
 *     />
 *   ),
 * };
 * ```
 */
export function ModifierMatrix<
  TRow extends string = string,
  TCol extends string = string,
>({
  component: Component,
  rowAxis,
  columnAxis,
  includeNone = true,
  noneLabel = "Default",
  baseProps = {},
  renderCell,
  title,
  className,
}: ModifierMatrixProps<TRow, TCol>) {
  // Build row values array with optional "none"
  const rowValues: (TRow | undefined)[] = [
    ...(includeNone === true || includeNone === "row" ? [undefined] : []),
    ...rowAxis.values,
  ];

  // Build column values array with optional "none"
  const colValues: (TCol | undefined)[] = [
    ...(includeNone === true || includeNone === "column" ? [undefined] : []),
    ...columnAxis.values,
  ];

  const getRowLabel = (value: TRow | undefined): string => {
    if (value === undefined) return noneLabel;
    return rowAxis.labels?.[value] ?? capitalize(value);
  };

  const getColLabel = (value: TCol | undefined): string => {
    if (value === undefined) return noneLabel;
    return columnAxis.labels?.[value] ?? capitalize(value);
  };

  const defaultRenderCell = (
    rowValue: TRow | undefined,
    colValue: TCol | undefined,
  ) => {
    const props = {
      ...baseProps,
      ...(rowValue !== undefined ? { [rowAxis.prop]: rowValue } : {}),
      ...(colValue !== undefined ? { [columnAxis.prop]: colValue } : {}),
    };
    return <Component {...props} />;
  };

  return (
    <div className={["modifier-matrix", className].filter(Boolean).join(" ")}>
      {title && <h3 className="title">{title}</h3>}
      <table className="table">
        <thead>
          <tr>
            <th className="header corner">
              <span className="axis-label row">{rowAxis.name}</span>
              <span className="axis-label col">{columnAxis.name}</span>
            </th>
            {colValues.map((colValue, colIdx) => (
              <th
                key={colValue ?? `col-none-${colIdx}`}
                className="header col-header"
              >
                {getColLabel(colValue)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowValues.map((rowValue, rowIdx) => (
            <tr key={rowValue ?? `row-none-${rowIdx}`}>
              <th className="header row-header">{getRowLabel(rowValue)}</th>
              {colValues.map((colValue, colIdx) => (
                <td
                  key={`${rowValue ?? "none"}-${colValue ?? "none"}-${rowIdx}-${colIdx}`}
                  className="cell"
                >
                  {renderCell
                    ? renderCell({
                        rowValue,
                        colValue,
                        Component,
                        baseProps,
                      })
                    : defaultRenderCell(rowValue, colValue)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

export default ModifierMatrix;
