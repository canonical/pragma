/**
 * What a parameter accepts ON THE WIRE — stated once.
 *
 * The MCP projector builds its input schema from this and the reference
 * generator prints it, so the documented type and the validated type cannot
 * drift: the reference used to mirror the schema by hand, and a mirror is only
 * right until one side changes.
 *
 * A parameter is a LIST when several values are a legal answer to it: a
 * `string[]` positional, and every `repeatable` flag (the CLI spelling of the
 * same fact is the flag repeated). A list is ADVERTISED as an array and a bare
 * value is coerced into a one-element one, so the two ways a caller can be
 * slightly wrong cost nothing: a filter that took one value forced twenty calls
 * where one would do, and a lookup handed `name: "color.text"` refused the call
 * outright over a pair of brackets.
 *
 * Pure and zod-free: the reference generator runs on the storeless path.
 */

import type { ParamSpec } from "./types.js";

/** The type of one value of a parameter. */
export type WireItem =
  | { readonly kind: "string" | "number" | "boolean" }
  | { readonly kind: "enum"; readonly values: readonly string[] };

/** A parameter's wire type: what one value is, and whether several are taken. */
export interface WireType {
  readonly item: WireItem;
  /** Several values are accepted (and one bare value is coerced to a list). */
  readonly list: boolean;
}

/**
 * Derive the wire type of a parameter from its spec.
 *
 * @param param - The parameter spec.
 * @returns The one statement both the schema and the reference read.
 */
export function wireType(param: ParamSpec): WireType {
  if (param.kind === "string[]") {
    return { item: { kind: "string" }, list: true };
  }
  const item: WireItem =
    param.kind === "enum"
      ? { kind: "enum", values: param.values }
      : { kind: param.kind };
  return { item, list: param.repeatable === true };
}

/**
 * Print a wire type as the reference's type label (`string[]`,
 * `enum(a, b)[]`). Enum values are comma-joined, never pipe-joined, so the
 * label is safe inside a Markdown table cell without escaping.
 *
 * @param wire - The wire type to print.
 * @returns The label.
 */
export function formatWireType(wire: WireType): string {
  const item =
    wire.item.kind === "enum"
      ? `enum(${wire.item.values.join(", ")})`
      : wire.item.kind;
  return wire.list ? `${item}[]` : item;
}
