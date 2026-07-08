import bindField from "../../common/bindField/index.js";
import withWrapper from "../../common/Wrapper/withWrapper.js";
import { FileUploadInput } from "../../subcomponent/FileUploadInput/index.js";
import type { FileUploadFieldProps } from "./types.js";

/**
 * FileUploadInput bound to react-hook-form (controlled), wrapped with field chrome.
 * The `defaultValue` preserves the registration default the original leaf set
 * in `useController` (`[]`).
 *
 * `import { FileUploadField } from "@canonical/react-ds-global-form";`
 */
export default withWrapper<FileUploadFieldProps>(
  bindField<FileUploadFieldProps>(FileUploadInput, "controlled", {
    defaultValue: [],
  }),
);
