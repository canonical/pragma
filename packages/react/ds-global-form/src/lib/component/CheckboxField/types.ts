import type { ToggleFieldProps } from "#lib/common/types.js";
import type { CheckboxInputProps } from "#lib/subcomponent/CheckboxInput/index.js";

/**
 * Props for the react-hook-form-bound Checkbox field (presentational +
 * binding). A toggle field: requires at least one of `label`/`controlLabel`.
 */
export type CheckboxFieldProps = ToggleFieldProps<CheckboxInputProps>;
