import type { ReactNode } from "react";
import type { ContextOptions, ShowcaseExample } from "../types.js";

/** The context provider props for the config provider */
export interface ProviderProps {
  /** The examples that can be controlled by this provider */
  items: ShowcaseExample[];
  /** The children to render, which will have access to the config context */
  children: ReactNode;
}

export type UseProviderStateProps = Omit<ProviderProps, "children">;

export type UseProviderStateResult = ContextOptions;
