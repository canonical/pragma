import type { JSONSchema7 } from "json-schema";

// Type for file rules
export interface FileRule {
  name: string; // e.g., "config.json"
  contains: JSONSchema7; // JSON schema for file content validation
}

// Type for directory rules
export interface DirectoryRule {
  name: string; // e.g., "src"
  contains?: {
    // Optional nested structure
    files?: FileRule[]; // List of file rules
    directories?: DirectoryRule[]; // Nested directory rules
  };
  strict?: boolean; // Optional flag for strict validation
}

// Union type for rules
export type Rule = { file: FileRule } | { directory: DirectoryRule };

// Schema type with special properties and dynamic rule names
export interface Schema {
  $schema?: string; // Optional meta-schema reference
  name: string; // Required schema name
  extends?: string[]; // Optional list of schemas to extend
  [ruleName: string]: Rule | string | string[] | undefined; // Rules and special properties
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  message?: string;
  // Verbose context information
  context?: {
    type: "file" | "directory";
    target: string; // The file or directory path being validated
    description?: string; // Human-readable description of what was checked
    schema?: unknown; // The schema that was applied (for verbose output)
    value?: unknown; // What was found (for verbose output)
  };
}

export interface RulesetLocation {
  type: "bundled" | "local";
  path: string;
  name: string;
}
