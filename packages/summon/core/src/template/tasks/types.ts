import type TemplatingEngine from "../TemplatingEngine.js";

export interface TemplateOptions {
  /** Path to the template file */
  source: string;
  /** Destination path (can contain template variables) */
  dest: string;
  /** Variables to pass to the template */
  vars: Record<string, unknown>;
  /** Templating engine to use (defaults to EJS) */
  engine?: TemplatingEngine;
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
  /** Templating engine to use (defaults to EJS) */
  engine?: TemplatingEngine;
}
