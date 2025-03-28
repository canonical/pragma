import type { ContextOptions, ProviderProps } from "../types.js";

export type UseProviderStateProps = Omit<ProviderProps, "children">;

export type UseProviderStateResult = ContextOptions;
