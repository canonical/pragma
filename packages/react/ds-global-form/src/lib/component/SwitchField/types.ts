import type { ToggleFieldProps } from "../../common/types.js";
import type { SwitchInputProps } from "../../subcomponent/SwitchInput/index.js";

/**
 * Props for the react-hook-form-bound Switch field (presentational + binding).
 * A toggle field: requires at least one of `label`/`controlLabel`.
 */
export type SwitchFieldProps = ToggleFieldProps<SwitchInputProps>;
