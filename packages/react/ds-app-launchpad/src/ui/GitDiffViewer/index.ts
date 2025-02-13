/* @canonical/generator-canonical-ds 0.0.1 */

export * from "./common/index.js";
export * from "./hooks/index.js";
export * from "./types.js";
export * from "./utils/index.js";

import Provider from "./Provider.js";
import { CodeDiffViewer, FileHeader } from "./common/index.js";
import type { GitDiffViewerComponent } from "./types.js";

export const GitDiffViewer = Provider as GitDiffViewerComponent;
GitDiffViewer.FileHeader = FileHeader;
GitDiffViewer.CodeDiffViewer = CodeDiffViewer;
