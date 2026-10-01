import type { StoryObj } from "@storybook/react-vite";
import type { RegisterOptions } from "react-hook-form";
import * as decorators from "./decorators.js";

interface ErrorStoryParams {
  /** Field name; also the field marked touched so the error surfaces. */
  name: string;
  /** Visible label. */
  label: string;
  /** Error message shown by the field. */
  message?: string;
  /**
   * Validation rule that fails for the (empty) default value. Defaults to a
   * `required` rule, which is the common case.
   */
  registerProps?: RegisterOptions;
  /** Extra args merged onto the field (e.g. `options` for a choices field). */
  extraArgs?: Record<string, unknown>;
}

/**
 * Builds the `WithError` story for a `*Field` component: the field is rendered
 * inside a form, registered, marked TOUCHED, and given a validation rule that
 * fails for its empty value — so react-hook-form reports an error, the Wrapper
 * adds `.danger` to `.ds.field`, and the component renders in its real error
 * state (red chrome + `FieldError` message). This is what makes each field's
 * own error presentation visible (and snapshot-able) rather than a generic one.
 *
 * Each field's error state differs (text border vs. choice group vs. file
 * drop-zone …), which is why every `*Field` gets its own `WithError`.
 *
 * @returns a Storybook `StoryObj` for the field's `meta`.
 */
export function errorStory({
  name,
  label,
  message = `${label} is required`,
  registerProps,
  extraArgs,
  // biome-ignore lint/suspicious/noExplicitAny: the helper is meta-agnostic; each field assigns it to its own StoryObj<typeof meta>.
}: ErrorStoryParams): StoryObj<any> {
  return {
    decorators: [decorators.form({ touchedFields: [name] })],
    args: {
      name,
      label,
      registerProps: registerProps ?? {
        required: { value: true, message },
      },
      ...extraArgs,
    },
  };
}
