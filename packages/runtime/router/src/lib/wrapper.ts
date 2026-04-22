import type { WrapperDefinition } from "./types.js";

/** Construct a wrapper with nominal identity. */
export default function wrapper<TRendered = unknown>(
  definition: WrapperDefinition<TRendered>,
): WrapperDefinition<TRendered> {
  return definition;
}
