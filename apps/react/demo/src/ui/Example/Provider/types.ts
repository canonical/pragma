import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { ExampleOutputFormat, ShowcaseExampleOpts } from "../types.js";

/** The context provider props for the config provider */
export interface ProviderProps {
  /** The examples that can be controlled by this provider */
  items: ShowcaseExampleOpts[];
  /** The children to render, which will have access to the config context */
  children: ReactNode;
}

/** The value of the config context */
export interface ProviderValue {
  /** The current active example name */
  activeExampleIndex?: number;
  /** The function to set the active example name. Use this to change which example is currently active. */
  setActiveExampleIndex: Dispatch<SetStateAction<number>>;
  /** All examples that can be controlled by this provider */
  allExamples: ShowcaseExampleOpts[];
  /** The currently active example's parameters */
  activeExample: ShowcaseExampleOpts;
  // biome-ignore lint/suspicious/noExplicitAny: fixme later
  output: { [key in ExampleOutputFormat]: any };
}
