import { Box, Text } from "ink";
import { PREFIX_MAP } from "../../../domains/shared/prefixes.js";
import { BulletList } from "../BulletList/index.js";
import { CodeBlock } from "../CodeBlock/index.js";
import { MarkdownText } from "../MarkdownText/index.js";
import { MiniTable } from "../MiniTable/index.js";
import { TreeView } from "../TreeView/index.js";
import type { SectionRendererProps } from "./types.js";

/**
 * Dispatches a lookup section to the appropriate rendering component
 * based on the section's `kind`.
 *
 * Skips rendering when the section value is empty and `showWhenEmpty`
 * is not set. Renders a section heading followed by the kind-specific
 * component.
 */
export default function SectionRenderer<T>({
  section,
  entity,
  options,
  domain: _domain,
}: SectionRendererProps<T>) {
  const value = entity[section.key];
  if (!section.showWhenEmpty && isEmpty(value)) return null;

  const prefixes = options.prefixes ?? PREFIX_MAP;
  const content = renderByKind(value, section.kind, options, section, prefixes);
  if (!content) return null;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>{`  ${section.heading}`}</Text>
      {content}
    </Box>
  );
}

function renderByKind<T>(
  value: unknown,
  kind: string,
  options: SectionRendererProps<T>["options"],
  section: SectionRendererProps<T>["section"],
  prefixes: Readonly<Record<string, string>>,
): React.JSX.Element | null {
  switch (kind) {
    case "field": {
      if (typeof value !== "string" || value.trim().length === 0) return null;
      return <MarkdownText content={value} />;
    }
    case "code": {
      if (typeof value !== "string" || value.trim().length === 0) return null;
      const language =
        options.codeLanguage?.(section, value) ?? inferCodeLanguage(value);
      return <CodeBlock code={value} language={language} />;
    }
    case "tree": {
      return <TreeView data={value} prefixes={prefixes} />;
    }
    case "table":
    case "nested-table": {
      if (!Array.isArray(value) || value.length === 0) return null;
      return (
        <MiniTable
          data={value as Record<string, unknown>[]}
          prefixes={prefixes}
        />
      );
    }
    case "list": {
      if (!Array.isArray(value) || value.length === 0) return null;
      return <BulletList items={value} prefixes={prefixes} />;
    }
    default:
      return null;
  }
}

function inferCodeLanguage(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("@prefix") || trimmed.includes(" a ")) return "ttl";
  if (trimmed.includes(":") && trimmed.includes("\n")) return "yaml";
  return "text";
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}
