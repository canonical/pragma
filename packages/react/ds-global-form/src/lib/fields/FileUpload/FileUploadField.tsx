import { FileUpload } from "../../inputs/FileUpload/index.js";
import bindField from "../common/bindField.js";
import withWrapper from "../common/Wrapper/withWrapper.js";
import type { FileUploadProps } from "./types.js";

/**
 * FileUpload bound to react-hook-form (controlled), wrapped with field chrome.
 * The `defaultValue` preserves the registration default the original leaf set
 * in `useController` (`[]`).
 */
export default withWrapper<FileUploadProps>(
  bindField<FileUploadProps>(FileUpload, "controlled", { defaultValue: [] }),
);
