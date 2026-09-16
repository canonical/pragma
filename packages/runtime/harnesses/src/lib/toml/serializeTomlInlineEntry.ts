/**
 * One MCP entry as a SINGLE LINE of TOML — the dotted-key inline-table
 * spelling of exactly what {@link serializeTomlSection} writes as a table.
 *
 * It exists for the places that can print only one line: a skip's remedy is
 * one dim line beneath the row, and a `[mcp_servers.pragma]` header plus its
 * fields cannot be one line in TOML's table grammar. The inline table is
 * TOML's own one-line form for the same data, and the VALUES come from
 * `formatTomlValue` — the formatter the file writer uses — so the two
 * spellings can never disagree about how a string, a number or an array is
 * written.
 */

import { formatTomlValue } from "./toml-values.js";

/**
 * @param sectionPrefix - The server-map key (e.g. `mcp_servers`).
 * @param name - The server entry name.
 * @param fields - The already-serialized entry fields.
 * @returns One line of TOML: `<prefix>.<name> = { key = value, … }`.
 * @note Pure — string composition only.
 */
export default function serializeTomlInlineEntry(
  sectionPrefix: string,
  name: string,
  fields: Record<string, unknown>,
): string {
  const body = Object.entries(fields)
    .map(([key, value]) => `${key} = ${formatTomlValue(value)}`)
    .join(", ");
  return `${sectionPrefix}.${name} = { ${body} }`;
}
