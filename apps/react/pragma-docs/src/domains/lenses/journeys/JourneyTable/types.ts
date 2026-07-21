import type { JourneyRow, JourneyTableState } from "../journeyTableModel.js";

export interface JourneyTableProps {
  /** Additional CSS class names. */
  className?: string;
  /** Every job the model carries, already flattened into rows. */
  readonly rows: readonly JourneyRow[];
  /** The table's ephemeral arrangement (sort + direction + group). */
  readonly state: JourneyTableState;
  /** Change the arrangement — the explorer owns the state. */
  readonly onStateChange: (next: JourneyTableState) => void;
  /** The expanded jobs' URIs. Ephemeral, never in the URL. */
  readonly expanded: ReadonlySet<string>;
  /** Toggle one job's expansion. */
  readonly onToggleExpanded: (uri: string) => void;
  /** The selected job (graph URI), or undefined on `/journeys`. */
  readonly job: string | undefined;
}
