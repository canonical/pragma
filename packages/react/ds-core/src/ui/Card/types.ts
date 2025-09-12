/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { ModifierFamily } from "@canonical/ds-types";
import type { HTMLAttributes } from "react";

/**
 * @migration 1.0.0 - `overlay` is no longer supported
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * TODO we need to verify with DS ontology group whether it is expected that a component consume ALL of a modifier family
   *  Card in vanilla does not currently support the "muted" or "accented" emphasis modifiers.
   */
  emphasis?: ModifierFamily<"emphasis">;

  /**
   * @migration 1.0.0 - support for the non "content bleed" card has been removed for now to keep the component simpler. It may be added back if requested.
   */

  /**
   * @migration 1.0.0 - the Card previously accepted `title` and `thumbnail` as props. These have been removed in favor of a more flexible composition model.
   */

  /**
   * TODO make the card consume the Grid when Grid is implemented
   */
}
