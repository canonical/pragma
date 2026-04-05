import type { WrapperDefinition, WrapperInput } from "./types.js";

/** Construct a wrapper with nominal identity. */
export default function wrapper<TData = void, TRendered = unknown>(
  definition: WrapperInput<TData, TRendered>,
): WrapperDefinition<TData, TRendered> {
  return definition;
}
