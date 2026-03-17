/**
 * Remove a named table from TOML content.
 */

export default function removeTomlSection(
  content: string,
  sectionPrefix: string,
  name: string,
): string {
  const header = `[${sectionPrefix}.${name}]`;
  const lines = content.split("\n");
  const result: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === header) {
      skipping = true;
      continue;
    }

    if (skipping && trimmed.startsWith("[")) {
      skipping = false;
    }

    if (!skipping) {
      result.push(line);
    }
  }

  return result.join("\n");
}
