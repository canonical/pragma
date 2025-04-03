import type { UseFormReturn } from "react-hook-form";
import type { ShowcaseExample } from "../../ui/index.js";

// biome-ignore lint/suspicious/noExplicitAny: Form values could have any shape
export type FormValues = Record<string, any>;

export type useGlobalFormResult = {
  /** The form methods and state */
  methods: UseFormReturn<FormValues>;
  /** The default values for the form */
  defaultValues: FormValues;
  /** The showcase examples that can be controlled by the form */
  examples: ShowcaseExample[];
};
