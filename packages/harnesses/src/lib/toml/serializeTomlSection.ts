/**
 * Serialize a record of entries into TOML table format under a section prefix.
 */

import { formatTomlValue } from "./toml-values.js";

export default function serializeTomlSection(
  sectionPrefix: string,
  entries: Record<string, Record<string, unknown>>,
): string {
  const lines: string[] = [];

  for (const [name, fields] of Object.entries(entries)) {
    lines.push(`[${sectionPrefix}.${name}]`);
    for (const [key, value] of Object.entries(fields)) {
      lines.push(`${key} = ${formatTomlValue(value)}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
