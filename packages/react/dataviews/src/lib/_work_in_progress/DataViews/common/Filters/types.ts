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
  readonly labels?: Readonly<Record<string, string>> | undefined;
};

/**
 * Props of the connected filters part. The root is the GET form the
 * baseline submits, so it extends native form props; inside it a `fieldset`
 * named by `label` groups the controls. `children` is excluded: the controls
 * are derived from the provider, not composed by hand. So are `method` and
 * `onSubmit`, which make the form the baseline's — a GET the enhancement
 * intercepts — and `aria-label` and `aria-labelledby`, since the group is
 * what carries the name. `label` names that group rather than the root, a
 * recorded departure from the convention: a form is named by nothing
 * native, and the group is what a reader lands on. The form takes no
 * `disabled`: the fieldset inside is the part's, and nothing composes the
 * filters disabled yet.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsFiltersProps = OwnProps &
  Omit<
    ComponentProps<"form">,
    | keyof OwnProps
    | "children"
    | "method"
    | "onSubmit"
    | "aria-label"
    | "aria-labelledby"
  >;
