import type { RowModelConfig } from "./createRowModel.js";
import createRowModel from "./createRowModel.js";
import type { RowModel } from "./types.js";

/**
 * The model of a build the case expects to succeed, so a case about
 * something else states its rows once and reads the model directly.
 */
export const builtRowModel = <TRow extends object>(
  config: RowModelConfig<TRow>,
): RowModel<TRow> => {
  const result = createRowModel<TRow>(config);
  if (result.status !== "built") {
    throw new Error(`expected a built row model, got: ${result.reason}`);
  }
  return result.model;
};
