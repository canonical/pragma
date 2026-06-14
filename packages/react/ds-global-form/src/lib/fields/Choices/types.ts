import type {
  ChoiceOption,
  ChoicesPresentationProps,
} from "../../inputs/Choices/index.js";
import type { InputProps } from "../types.js";

export type { ChoiceOption };

/** Props for the react-hook-form-bound Choices field. */
export type ChoicesProps = InputProps<ChoicesPresentationProps>;
