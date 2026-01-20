/**
 * FileTreePreview Component
 *
 * Displays a list of files that will be created/modified.
 */

import { Box, Text } from "ink";
import type { Effect } from "../types.js";

export interface FileTreePreviewProps {
  /** Effects to display */
  effects: Effect[];
  /** Title for the preview */
  title?: string;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getEffectInfo = (
  effect: Effect,
): { path: string; action: string; size?: number } | null => {
  switch (effect._tag) {
    case "WriteFile":
      return {
        path: effect.path,
        action: "create",
        size: effect.content.length,
      };
    case "MakeDir":
      return { path: effect.path, action: "mkdir" };
    case "CopyFile":
      return { path: effect.dest, action: "copy" };
    case "DeleteFile":
      return { path: effect.path, action: "delete" };
    case "DeleteDirectory":
      return { path: effect.path, action: "rmdir" };
    default:
      return null;
  }
};

export const FileTreePreview = ({
  effects,
  title = "Files to be created:",
}: FileTreePreviewProps) => {
  // Deduplicate effects by path (keep first occurrence, which preserves WriteFile over MakeDir)
  const seen = new Set<string>();
  const fileEffects = effects
    .map(getEffectInfo)
    .filter((info): info is NonNullable<typeof info> => {
      if (info === null) return false;
      if (seen.has(info.path)) return false;
      seen.add(info.path);
      return true;
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  if (fileEffects.length === 0) {
    return (
      <Box>
        <Text dimColor>No files will be created.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {title}
      </Text>
      <Box marginLeft={1} flexDirection="column">
        {fileEffects.map((info, i) => {
          const actionColor =
            info.action === "delete" || info.action === "rmdir"
              ? "red"
              : "green";
          const actionIcon =
            info.action === "delete" || info.action === "rmdir" ? "-" : "+";

          return (
            <Box key={`${info.path}-${i}`}>
              <Text color={actionColor}>{actionIcon} </Text>
              <Text>{info.path}</Text>
              {info.size !== undefined && (
                <Text dimColor> ({formatBytes(info.size)})</Text>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};
