import type { ReactNode } from "react";
import type {
  ContextOptions,
  ExampleOutputFormat,
  ExampleSettingValue,
  ShowcaseExample,
} from "../types.js";

/** The context provider props for the config provider */
export interface ProviderProps {
  /** The examples that can be controlled by this provider */
  items: ShowcaseExample[];
  /** The default values for each example. Mapping of example index to control name to default vaulue. */
  defaultValues: Record<number, Record<string, ExampleSettingValue>>;
  /** The children to render, which will have access to the config context */
  children: ReactNode;

  outputFormats?: ExampleOutputFormat[];
}

export type UseProviderStateProps = Omit<ProviderProps, "children">;

export type UseProviderStateResult = ContextOptions;
