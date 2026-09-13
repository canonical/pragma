import { type ReactElement, useMemo } from "react";
import { listHiddenFields } from "../../../../utils/index.js";
import { useDestination } from "../../hooks/index.js";
import type { HiddenQueryFieldsProps } from "./types.js";

/**
 * The hidden controls of one of the composition's GET forms: every
 * parameter of the destination a submission reaches, less the names the
 * form's own controls submit. A leaf of its own, so the form around it —
 * with every control in it — does not redraw each time the destination
 * moves: only this list does.
 */
export default function HiddenQueryFields({
  provider,
  destinationOf,
  omit,
}: HiddenQueryFieldsProps): ReactElement {
  const spelled = useDestination({ provider, destinationOf });
  const fields = useMemo(
    () =>
      listHiddenFields(
        spelled === null ? null : new URLSearchParams(spelled),
        omit,
      ),
    [spelled, omit],
  );
  return (
    <>
      {fields.map((field) => (
        <input
          key={field.key}
          type="hidden"
          name={field.name}
          value={field.value}
        />
      ))}
    </>
  );
}
