/* @canonical/generator-ds 0.10.0-experimental.2 */

import type { ModifierFamily } from "@canonical/ds-types";
import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * TODO we need to verify with DS ontology group whether it is expected that a component consume ALL of a modifier family
   *  Card in vanilla does not currently support the "muted" or "accented" emphasis modifiers.
   */
  emphasis?: ModifierFamily<"emphasis">;
}
