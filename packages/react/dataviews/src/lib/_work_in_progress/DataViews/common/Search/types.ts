import type { ComponentProps } from "react";

type OwnProps = {
  /** The input's visible label, which names the search. Defaults to the messages' `search`. */
  readonly label?: string;
};

/**
 * Props of the connected search part. The props are the search input's, so
 * `placeholder`, `autoFocus`, `className`, `aria-describedby` and every
 * other native input attribute reach it; the GET form around the input,
 * which is the search landmark, is the baseline's transport and takes
 * nothing from the caller. Omitted: `type`, `name`, `value`, `defaultValue` and `onChange`,
 * which bind the input to the applied search, `form`, which binds it to its
 * own form, and `aria-label` and `aria-labelledby`, which would override the
 * name it takes from `label`. A recorded departure from the root-spread and
 * wrapper conventions: the props reach the input rather than the root or an
 * `inputProps` member, because the input is the part and the form around
 * it is its transport.
 *
 * @experimental Pre-release: the whole surface is still settling, and this
 * name may change or move before the first release.
 */
export type DataViewsSearchProps = OwnProps &
  Omit<
    ComponentProps<"input">,
    | keyof OwnProps
    | "type"
    | "name"
    | "value"
    | "defaultValue"
    | "onChange"
    | "form"
    | "aria-label"
    | "aria-labelledby"
  >;
