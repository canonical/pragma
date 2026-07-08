import type { InputProps } from "../../common/types.js";
import type { RatingInputProps } from "../../subcomponent/RatingInput/index.js";

/**
 * Props for the react-hook-form-bound Rating field (presentational + binding).
 * The rating value is owned by the field; the presentational RatingInput reads
 * it via `value`/`onChange`.
 */
export type RatingFieldProps = InputProps<RatingInputProps>;
