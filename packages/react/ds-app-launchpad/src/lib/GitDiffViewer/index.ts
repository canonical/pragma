/* @canonical/generator-canonical-ds 0.0.1 */
export * from "./hooks/index.js";
export type { DiffFile as GitDiffFile, Hunk as GitDiffHunk } from "./types.js";
export * from "./utils/index.js";

import { CodeDiffViewer, FileHeader } from "./common/index.js";
import Provider from "./Provider.js";

export const GitDiffViewer = Provider as typeof Provider & {
  FileHeader: typeof FileHeader;
  CodeDiffViewer: typeof CodeDiffViewer;
};
GitDiffViewer.FileHeader = FileHeader;
GitDiffViewer.CodeDiffViewer = CodeDiffViewer;
