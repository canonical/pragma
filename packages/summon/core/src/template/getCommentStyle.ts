import * as path from "node:path";

interface CommentStyle {
  single?: string;
  blockStart?: string;
  blockEnd?: string;
  preferBlock?: boolean;
}

const COMMENT_STYLES: Record<string, CommentStyle> = {
  ".ts": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".tsx": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".js": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".jsx": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".mjs": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".cjs": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".css": { blockStart: "/*", blockEnd: "*/", preferBlock: true },
  ".scss": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".sass": { single: "//" },
  ".less": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".html": { blockStart: "<!--", blockEnd: "-->" },
  ".htm": { blockStart: "<!--", blockEnd: "-->" },
  ".xml": { blockStart: "<!--", blockEnd: "-->" },
  ".svg": { blockStart: "<!--", blockEnd: "-->" },
  ".vue": { blockStart: "<!--", blockEnd: "-->" },
  ".svelte": { blockStart: "<!--", blockEnd: "-->" },
  ".json": {},
  ".yaml": { single: "#" },
  ".yml": { single: "#" },
  ".toml": { single: "#" },
  ".sh": { single: "#" },
  ".bash": { single: "#" },
  ".zsh": { single: "#" },
  ".fish": { single: "#" },
  ".py": { single: "#" },
  ".rb": { single: "#" },
  ".pl": { single: "#" },
  ".go": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".rs": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".java": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".kt": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".swift": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".c": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".cpp": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".h": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".hpp": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".php": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".md": { blockStart: "<!--", blockEnd: "-->" },
  ".mdx": { blockStart: "{/*", blockEnd: "*/}" },
  ".sql": { single: "--", blockStart: "/*", blockEnd: "*/" },
};

/**
 * Get the comment style for a given file path.
 */
export default function getCommentStyle(filePath: string): CommentStyle | null {
  const ext = path.extname(filePath).toLowerCase();
  return COMMENT_STYLES[ext] ?? null;
}
