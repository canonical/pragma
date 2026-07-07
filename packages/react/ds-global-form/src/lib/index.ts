// Public package surface (unchanged by the tier restructure): the Field pattern
// (Field + FieldProps + the shared/machinery types it re-exports), the Form
// pattern, and the form middleware. The component/ and subcomponent/ tiers are
// otherwise internal — composed by the Field pattern, not exported at the root.
export * from "./pattern/index.js";
// RatingInput is exposed directly (work in progress): a standalone input that
// consumers use on its own rather than only through the Field pattern.
export type {
  RatingInputProps,
  RatingScale,
} from "./subcomponent/RatingInput/index.js";
export { RatingInput } from "./subcomponent/RatingInput/index.js";
export * from "./utils/middleware/index.js";
