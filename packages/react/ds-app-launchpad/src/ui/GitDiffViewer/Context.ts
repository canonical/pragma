import { createContext } from "react";
import type { ContextOptions } from "./types.js";

const GitDiffViewerContext = createContext<ContextOptions | null>(null);

export default GitDiffViewerContext;
