/**
 * What a parameter accepts on the wire, stated once: the MCP schema is built
 * from it and the reference prints it. A `string[]` positional and every
 * `repeatable` flag are LISTS — advertised as an array, with one bare string
 * coerced to a list of one. Pure and zod-free (the reference is storeless).
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
