import { Box, Text } from "ink";
import compactUri from "../../../domains/shared/compactUri.js";
import { PREFIX_MAP } from "../../../domains/shared/prefixes.js";
import type { TreeViewProps } from "./types.js";

/**
 * A tree display with box-drawing connectors.
 *
 * Recursively renders tree nodes with `├─` / `└─` connectors and
 * proper indentation. Handles nodes with `name`, `uri`, and
 * `children` fields, as well as rooted trees with a `root` field.
 */
export default function TreeView({ data, prefixes }: TreeViewProps) {
  const prefixMap = prefixes ?? PREFIX_MAP;
  const lines = buildTreeLines(data, prefixMap);

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {lines.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static tree lines
        <Text key={i}>{line}</Text>
      ))}
    </Box>
  );
}

function buildTreeLines(
  value: unknown,
  prefixes: Readonly<Record<string, string>>,
  depth = 0,
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => buildTreeLines(entry, prefixes, depth));
  }

  if (!value || typeof value !== "object") {
    return typeof value === "string" && value.length > 0
      ? [
          `${"  ".repeat(depth)}${depth > 0 ? "├─ " : ""}${formatValue(value, prefixes)}`,
        ]
      : [];
  }

  const rootedTree = value as { root?: unknown };
  if (rootedTree.root) {
    return buildTreeLines(rootedTree.root, prefixes, depth);
  }

  const node = value as {
    name?: unknown;
    uri?: unknown;
    children?: unknown;
  };

  const label =
    typeof node.name === "string" && node.name.length > 0
      ? node.name
      : typeof node.uri === "string"
        ? compactUri(node.uri, prefixes)
        : "item";

  const prefix = depth > 0 ? "├─ " : "";
  const lines = [`${"  ".repeat(depth)}${prefix}${label}`];

  if (Array.isArray(node.children)) {
    lines.push(...buildTreeLines(node.children, prefixes, depth + 1));
  }

  return lines;
}

function formatValue(
  value: string,
  prefixes: Readonly<Record<string, string>>,
): string {
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    /^[a-z][a-z0-9+.-]*:/i.test(value)
  ) {
    return compactUri(value, prefixes);
  }
  return value;
}
