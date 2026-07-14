import type { RegisterOptions } from "react-hook-form";
import bindField from "../../common/bindField/index.js";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { FileUploadInput } from "../../subcomponent/FileUploadInput/index.js";
import type { FileUploadFieldProps } from "./types.js";

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
};

/**
 * Turn the `maxFiles`/`maxSize` props into a react-hook-form `validate` rule on
 * the selected `File[]`, so an over-limit or oversized selection reports a
 * standard field error (via the Wrapper's FieldError). Validation lives at the
 * field/RHF layer — the presentational input just reports the chosen files.
 */
const fileConstraintRules = ({
  maxFiles,
  maxSize,
}: Record<string, unknown>): RegisterOptions => {
  const hasMaxFiles = typeof maxFiles === "number";
  const hasMaxSize = typeof maxSize === "number";
  if (!hasMaxFiles && !hasMaxSize) return {};

  return {
    validate: (value: unknown) => {
      const files = Array.isArray(value) ? (value as File[]) : [];
      if (hasMaxFiles && files.length > maxFiles) {
        return `You can upload at most ${maxFiles} file${
          maxFiles === 1 ? "" : "s"
        }.`;
      }
      if (hasMaxSize) {
        const tooBig = files.find((file) => file.size > maxSize);
        if (tooBig) {
          return `${tooBig.name} exceeds ${formatFileSize(maxSize)}.`;
        }
      }
      return true;
    },
  };
};

/**
 * FileUploadInput bound to react-hook-form (controlled), wrapped with field
 * chrome. The `defaultValue` preserves the registration default the original
 * leaf set in `useController` (`[]`). `maxFiles`/`maxSize` are enforced as RHF
 * validation rules so violations surface as a standard field error rather than
 * being silently dropped in the input.
 *
 * `import { FileUploadField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<FileUploadFieldProps>(
  bindField<FileUploadFieldProps>(FileUploadInput, "controlled", {
    defaultValue: [],
    additionalRegisterProps: fileConstraintRules,
  }),
);
