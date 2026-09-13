import {
  createRowModel,
  type RowModel,
  type RowModelConfig,
} from "../src/lib/rows/index.js";

/**
 * The model of a build the case expects to succeed, so a case about
 * something else states its rows once and reads the model directly.
 */
export default function buildRowModel<TRow extends object>(
  config: RowModelConfig<TRow>,
): RowModel<TRow> {
  const result = createRowModel<TRow>(config);
  if (result.status !== "built") {
    throw new Error(`expected a built row model, got: ${result.reason}`);
  }
  return result.model;
}
