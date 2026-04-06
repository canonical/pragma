import type { WrapperDefinition } from "./types.js";

/** Construct a wrapper with nominal identity. */
export default function wrapper<TData = void, TRendered = unknown>(
  definition: WrapperDefinition<TData, TRendered>,
): WrapperDefinition<TData, TRendered> {
  return definition;
}
