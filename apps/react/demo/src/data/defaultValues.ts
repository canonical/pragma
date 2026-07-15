import type { FormValues } from "../ui/index.js";
import { SHOWCASE_EXAMPLES } from "./examples/index.js";

/**
 * Default form values for every showcase example, shaped exactly as
 * react-hook-form stores them: nested by example name, then keyed by field name
 * (`{ [exampleName]: { [fieldName]: defaultValue } }`).
 *
 * `SHOWCASE_EXAMPLES` is static, so this is derived once at module load and used
 * both to seed `useForm` and to reset individual examples to their defaults.
 */
export const FORM_DEFAULT_VALUES: FormValues = SHOWCASE_EXAMPLES.reduce(
  (examplesAcc, example) => {
    examplesAcc[example.name] = example.sections.reduce(
      (fieldsAcc, section) => {
        for (const field of section.fields) {
          fieldsAcc[field.name] = field.defaultValue;
        }
        return fieldsAcc;
      },
      {} as FormValues,
    );
    return examplesAcc;
  },
  {} as FormValues,
);
