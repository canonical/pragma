import { createContext } from "react";
import type { DiffViewerContextType } from "./types.js";

export const DiffViewerContext = createContext<DiffViewerContextType | null>(
  null,
);
