import { createContext } from "react";
import type { DiffViewerContextType } from "./types.js";

export const GitDiffViewerContext = createContext<DiffViewerContextType | null>(
  null,
);
