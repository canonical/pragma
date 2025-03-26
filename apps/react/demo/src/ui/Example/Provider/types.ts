import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { ExampleAction } from "../Reducer/index.js";
import type { ConfigState, ShowcaseExample } from "../types.js";

/** The context provider props for the config provider */
export interface ProviderProps {
  /** The examples that can be controlled by this provider */
  items: ShowcaseExample[];
  /** The children to render, which will have access to the config context */
  children: ReactNode;
}

/** The value of the config context */
export interface ProviderValue {
  /** The current state of all examples */
  config: ConfigState;
  /** The dispatch function to update the state */
  dispatch: Dispatch<ExampleAction>;
  /** The current active example name */
  activeExampleName?: string;
  /** The function to set the active example name. Use this to change which example is currently active. */
  setActiveExampleName: Dispatch<SetStateAction<string | undefined>>;
  /** The current active example */
  activeExample?: ShowcaseExample;
  /** All examples that can be controlled by this provider */
  allExamples: ShowcaseExample[];
}
