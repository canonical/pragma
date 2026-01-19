/**
 * Template Engine
 *
 * This module provides EJS-based template rendering utilities for generators.
 * Templates are a key part of code generation, allowing dynamic file creation.
 */

import * as path from "node:path";
import * as ejs from "ejs";
import { sequence_ } from "./combinators.js";
import { glob, mkdir, readFile, writeFile } from "./primitives.js";
import { task } from "./task.js";
import type { Task } from "./types.js";

// =============================================================================
// Stamp Options
// =============================================================================

export interface StampOptions {
  /** Generator name (e.g., "@canonical/summon-package") */
  generator: string;
  /** Generator version (e.g., "0.1.0") */
  version: string;
}

// =============================================================================
// Template Options
// =============================================================================

export interface TemplateOptions {
  /** Path to the template file */
  source: string;
  /** Destination path (can contain template variables) */
  dest: string;
  /** Variables to pass to the template */
  vars: Record<string, unknown>;
}

export interface TemplateDirOptions {
  /** Source directory containing templates */
  source: string;
  /** Destination directory */
  dest: string;
  /** Variables to pass to all templates */
  vars: Record<string, unknown>;
  /** File rename mappings (original -> new name, supports template vars) */
  rename?: Record<string, string>;
  /** Glob patterns to ignore */
  ignore?: string[];
  /** Content transformers by file extension or name */
  transform?: Record<string, (content: string) => string>;
}

// =============================================================================
// String Rendering
// =============================================================================

/**
 * Render a template string with variables.
 */
export const renderString = (
  template: string,
  vars: Record<string, unknown>,
): string => {
  return ejs.render(template, vars, { async: false });
};

/**
 * Render a template string asynchronously.
 */
export const renderStringAsync = async (
  template: string,
  vars: Record<string, unknown>,
): Promise<string> => {
  return ejs.render(template, vars, { async: true }) as Promise<string>;
};

// =============================================================================
// File Rendering
// =============================================================================

/**
 * Render a template file with variables.
 */
export const renderFile = async (
  templatePath: string,
  vars: Record<string, unknown>,
): Promise<string> => {
  return ejs.renderFile(templatePath, vars, { async: true });
};

// =============================================================================
// Template Tasks
// =============================================================================

/**
 * Render a single template file to a destination.
 */
export const template = (options: TemplateOptions): Task<void> => {
  // Render destination path with variables
  const destPath = renderString(options.dest, options.vars);
  const destDir = path.dirname(destPath);

  return task(mkdir(destDir))
    .chain(() => task(readFile(options.source)))
    .map((content) => renderString(content, options.vars))
    .chain((rendered) => task(writeFile(destPath, rendered)))
    .unwrap();
};

/**
 * Render a directory of templates to a destination.
 */
export const templateDir = (options: TemplateDirOptions): Task<void> => {
  return task(glob("**/*", options.source))
    .chain((files) => {
      const tasks = files
        .filter((file) => {
          // Filter out ignored patterns
          if (options.ignore) {
            return !options.ignore.some((pattern) => minimatch(file, pattern));
          }
          return true;
        })
        .map((file) => {
          const sourcePath = path.join(options.source, file);

          // Remove .ejs extension if present
          let destFile = file.replace(/\.ejs$/, "");

          // Apply renames
          if (options.rename?.[destFile]) {
            destFile = options.rename[destFile];
          }

          // Render destination path with variables
          destFile = renderString(destFile, options.vars);
          const destPath = path.join(options.dest, destFile);

          return template({
            source: sourcePath,
            dest: destPath,
            vars: options.vars,
          });
        });

      return task(sequence_(tasks));
    })
    .unwrap();
};

/**
 * Simple minimatch implementation for common patterns.
 */
const minimatch = (filepath: string, pattern: string): boolean => {
  // Convert glob pattern to regex
  const regex = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "<<GLOBSTAR>>")
    .replace(/\*/g, "[^/]*")
    .replace(/<<GLOBSTAR>>/g, ".*");

  return new RegExp(`^${regex}$`).test(filepath);
};

// =============================================================================
// Template Helpers
// =============================================================================

/**
 * Common template helpers that can be passed to templates.
 */
export const templateHelpers = {
  /**
   * Convert a string to camelCase.
   */
  camelCase: (str: string): string => {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/^[A-Z]/, (c) => c.toLowerCase());
  },

  /**
   * Convert a string to PascalCase.
   */
  pascalCase: (str: string): string => {
    const camel = templateHelpers.camelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  },

  /**
   * Convert a string to kebab-case.
   */
  kebabCase: (str: string): string => {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  },

  /**
   * Convert a string to snake_case.
   */
  snakeCase: (str: string): string => {
    return str
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toLowerCase();
  },

  /**
   * Convert a string to CONSTANT_CASE.
   */
  constantCase: (str: string): string => {
    return templateHelpers.snakeCase(str).toUpperCase();
  },

  /**
   * Capitalize the first letter of a string.
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Get the current date in ISO format.
   */
  isoDate: (): string => new Date().toISOString(),

  /**
   * Get the current year.
   */
  year: (): number => new Date().getFullYear(),

  /**
   * Indent a multi-line string.
   */
  indent: (str: string, spaces: number): string => {
    const pad = " ".repeat(spaces);
    return str
      .split("\n")
      .map((line) => pad + line)
      .join("\n");
  },

  /**
   * Join array items with a separator.
   */
  join: (arr: unknown[], separator = ", "): string => {
    return arr.map(String).join(separator);
  },

  /**
   * Pluralize a word based on count.
   */
  pluralize: (word: string, count: number): string => {
    return count === 1 ? word : `${word}s`;
  },
};

/**
 * Create a vars object with helpers included.
 */
export const withHelpers = (
  vars: Record<string, unknown>,
): Record<string, unknown> => ({
  ...templateHelpers,
  ...vars,
});

// =============================================================================
// Generator Metadata Comment
// =============================================================================

/**
 * Generate a metadata comment for generated files.
 */
export const generatorComment = (
  generatorName: string,
  options?: {
    version?: string;
    timestamp?: boolean;
  },
): string => {
  const parts = [`Generated by ${generatorName}`];

  if (options?.version) {
    parts.push(`v${options.version}`);
  }

  if (options?.timestamp) {
    parts.push(`on ${new Date().toISOString()}`);
  }

  return `// ${parts.join(" ")}`;
};

/**
 * Generate a metadata comment as an HTML comment.
 */
export const generatorHtmlComment = (
  generatorName: string,
  options?: {
    version?: string;
    timestamp?: boolean;
  },
): string => {
  const parts = [`Generated by ${generatorName}`];

  if (options?.version) {
    parts.push(`v${options.version}`);
  }

  if (options?.timestamp) {
    parts.push(`on ${new Date().toISOString()}`);
  }

  return `<!-- ${parts.join(" ")} -->`;
};

// =============================================================================
// Generated File Stamp
// =============================================================================

/**
 * Comment style configuration for different file types.
 */
interface CommentStyle {
  /** Single line comment prefix (e.g., "//") */
  single?: string;
  /** Block comment start (e.g., slash-star) */
  blockStart?: string;
  /** Block comment end (e.g., star-slash) */
  blockEnd?: string;
  /** Use block style even for single line (e.g., for CSS) */
  preferBlock?: boolean;
}

/**
 * Map of file extensions to comment styles.
 */
const COMMENT_STYLES: Record<string, CommentStyle> = {
  // JavaScript/TypeScript family
  ".ts": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".tsx": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".js": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".jsx": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".mjs": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".cjs": { single: "//", blockStart: "/*", blockEnd: "*/" },

  // CSS family (prefer block comments)
  ".css": { blockStart: "/*", blockEnd: "*/", preferBlock: true },
  ".scss": { single: "//", blockStart: "/*", blockEnd: "*/" },
  ".sass": { single: "//" },
  ".less": { single: "//", blockStart: "/*", blockEnd: "*/" },

  // HTML/XML family
  ".html": { blockStart: "<!--", blockEnd: "-->" },
  ".htm": { blockStart: "<!--", blockEnd: "-->" },
  ".xml": { blockStart: "<!--", blockEnd: "-->" },
  ".svg": { blockStart: "<!--", blockEnd: "-->" },
  ".vue": { blockStart: "<!--", blockEnd: "-->" },
  ".svelte": { blockStart: "<!--", blockEnd: "-->" },

  // Config files
  ".json": {}, // JSON doesn't support comments - skip stamp
  ".yaml": { single: "#" },
  ".yml": { single: "#" },
  ".toml": { single: "#" },

  // Shell/scripting
  ".sh": { single: "#" },
  ".bash": { single: "#" },
  ".zsh": { single: "#" },
  ".fish": { single: "#" },
  ".py": { single: "#" },
  ".rb": { single: "#" },
  ".pl": { single: "#" },

  // Other languages
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

  // Documentation
  ".md": { blockStart: "<!--", blockEnd: "-->" },
  ".mdx": { blockStart: "{/*", blockEnd: "*/}" },

  // SQL
  ".sql": { single: "--", blockStart: "/*", blockEnd: "*/" },
};

/**
 * Get the comment style for a given file path.
 */
export const getCommentStyle = (filePath: string): CommentStyle | null => {
  const ext = path.extname(filePath).toLowerCase();
  return COMMENT_STYLES[ext] ?? null;
};

/**
 * Generate a stamp comment for a generated file.
 * Returns null if the file type doesn't support comments.
 */
export const generateStamp = (
  filePath: string,
  options: StampOptions,
): string | null => {
  const style = getCommentStyle(filePath);
  if (!style) return null;

  // Skip if no comment syntax available
  if (!style.single && !style.blockStart) return null;

  const stampText = `Generated by ${options.generator} v${options.version}`;

  // Use block style if preferred or single not available
  if (style.preferBlock || (!style.single && style.blockStart)) {
    return `${style.blockStart} ${stampText} ${style.blockEnd}`;
  }

  // Use single line style
  if (style.single) {
    return `${style.single} ${stampText}`;
  }

  return null;
};

/**
 * Prepend a stamp to file content.
 * Handles shebang lines (#!/...) by placing stamp after them.
 */
export const prependStamp = (content: string, stamp: string): string => {
  // Check for shebang
  if (content.startsWith("#!")) {
    const firstNewline = content.indexOf("\n");
    if (firstNewline !== -1) {
      const shebang = content.slice(0, firstNewline + 1);
      const rest = content.slice(firstNewline + 1);
      return `${shebang}${stamp}\n${rest}`;
    }
  }

  return `${stamp}\n${content}`;
};
