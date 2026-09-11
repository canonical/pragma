import type { ComponentProps } from "react";

type OwnProps = {
  /** The group's legend, which names it. Defaults to "Filters". */
  readonly label?: string;
  /**
   * Visible names for fields, keyed by field name. A field with no entry is
   * named by its own field name. Presentation only: the fields on offer and
   * the operators they accept come from the provider's schema and its
   * source's declared capabilities.
   */
  readonly labels?: Readonly<Partial<Record<string, string>>>;
};

/**
 * Props of the connected filters part. The root is a `fieldset` naming the
 * group, so it extends native fieldset props — `disabled` reaches every
 * control for free. `children` is excluded: the controls are derived from
 * the provider, not composed by hand. So are `role`, which would override
 * the fieldset's `group` role, and `aria-label` and `aria-labelledby`,
 * which would override the name it takes from `label`.
 */
export type FiltersProps = OwnProps &
  Omit<
    ComponentProps<"fieldset">,
    keyof OwnProps | "children" | "role" | "aria-label" | "aria-labelledby"
  >;
