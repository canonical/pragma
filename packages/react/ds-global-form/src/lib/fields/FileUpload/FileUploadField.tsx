import bindField from "#lib/common/bindField.js";
import withWrapper from "#lib/common/Wrapper/withWrapper.js";
import { FileUpload } from "../../inputs/FileUpload/index.js";
import type { FileUploadProps } from "./types.js";

/**
 * FileUpload bound to react-hook-form (controlled), wrapped with field chrome.
 * The `defaultValue` preserves the registration default the original leaf set
 * in `useController` (`[]`).
 */
export default withWrapper<FileUploadProps>(
  bindField<FileUploadProps>(FileUpload, "controlled", { defaultValue: [] }),
);
