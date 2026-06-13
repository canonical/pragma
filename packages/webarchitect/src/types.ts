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

// Type for a single declared template variable
export interface VariableDeclaration {
  default: string; // Value used when no override is supplied
  schema?: JSONSchema7; // Optional JSON Schema constraining override values
}

// Map of variable name to its declaration
export type VariableDeclarations = Record<string, VariableDeclaration>;

// Schema type with special properties and dynamic rule names
export interface Schema {
  $schema?: string; // Optional meta-schema reference
  name: string; // Required schema name
  extends?: string[]; // Optional list of schemas to extend
  variables?: VariableDeclarations; // Optional template variables substituted as ${name}
  // Rules and special properties
  [ruleName: string]:
    | Rule
    | string
    | string[]
    | VariableDeclarations
    | undefined;
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
