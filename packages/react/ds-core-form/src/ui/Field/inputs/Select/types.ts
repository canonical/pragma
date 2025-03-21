/* @canonical/generator-ds 0.9.0-experimental.9 */
import type { InputProps, OptionsProps } from "../../types.js";

// export type TextareaProps = BaseInputProps &
// 	React.HTMeProps<HTMLTextAreaElement>;
//

type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export type SelectProps = InputProps<NativeSelectProps & OptionsProps>;
