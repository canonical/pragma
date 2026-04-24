/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { DistributiveOmit } from "../../../../../../type-utils/index.js";
import type { ButtonPrimitiveProps } from "../../../../../common/index.js";

export type SortButtonProps = DistributiveOmit<
  ButtonPrimitiveProps,
  "children"
> & {
  /**
   * Label describing the sort action of the button.
   *
   * @example "Sort by Name ascending", "Sort by Name descending", "Remove sorting by Name"
   */
  "aria-label": string;
};
