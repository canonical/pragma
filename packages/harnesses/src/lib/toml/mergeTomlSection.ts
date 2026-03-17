/**
 * Merge a TOML section into existing TOML content.
 * Replaces the named table if it exists, appends if it doesn't.
 */

import removeTomlSection from "./removeTomlSection.js";
import serializeTomlSection from "./serializeTomlSection.js";

export default function mergeTomlSection(
  content: string,
  sectionPrefix: string,
  name: string,
  fields: Record<string, unknown>,
): string {
  const removed = removeTomlSection(content, sectionPrefix, name);
  const newSection = serializeTomlSection(sectionPrefix, { [name]: fields });
  const trimmed = removed.trimEnd();
  return trimmed ? `${trimmed}\n\n${newSection}` : newSection;
}
