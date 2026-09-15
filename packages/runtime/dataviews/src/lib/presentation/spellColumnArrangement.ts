import { spellArrangementParams } from "../wire/index.js";
import resolveArrangementParams from "./resolveArrangementParams.js";
import type { SpellColumnArrangementConfig } from "./types.js";

/**
 * A set of link parameters carrying a column arrangement in place of the one
 * they carried, for a link followed where no script keeps the arrangement:
 * the stored order as it is stored, or the renderer's declared order where
 * none is stored, and every id the hidden list holds, those of columns
 * another table declares included; with no arrangement, neither. Every other
 * parameter survives, and the parameters given are not changed.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export default function spellColumnArrangement({
  params,
  columns,
  presentation,
}: SpellColumnArrangementConfig): URLSearchParams {
  return spellArrangementParams(
    params,
    presentation === null
      ? null
      : resolveArrangementParams({ columns, presentation }),
  );
}
