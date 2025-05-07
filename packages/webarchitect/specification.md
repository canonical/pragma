# Webarchitect Tool Specification

## Purpose
The "webarchitect" tool is a command-line utility designed to validate the architecture of a module—either a package or an application—against a predefined JSON schema. It ensures that required files exist and that their JSON content adheres to specified rules, promoting consistency, reducing configuration errors, and enforcing best practices across development workflows.

---

## Schema Structure
The schema is a JSON object that defines rules for validating a module's architecture. It must conform to the following structure:

- **"$schema"** (required): Points to the JSON Schema Draft 2020-12 (`"http://json-schema.org/draft/2020-12/schema"`).
- **"$id"** (required): A unique identifier for the schema, pointing to a placeholder URL (e.g., `"https://github.com/webarchitect/schemas/main/schema.json"`).
- **"description"** (required): A brief description of the schema (`"Schema for webarchitect"`).
- **"type"** (required): Set to `"object"`.
- **"properties"**:
  - **"name"** (required): A string identifying the specification name (e.g., `"webarchitect-v1"`).
- **"required"**: Includes `"name"`.
- **"additionalProperties"**: Allows additional rules (e.g., `"biome"`, `"package"`), each specifying a file to check and its expected JSON content.

### Root Schema Definition
```json
{
  "$schema": "http://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/canonical/ds25/webarchitect/schemas/main/schema.json",
  "description": "Schema for webarchitect",
  "type": "object",
  "properties": {
    "name": { "type": "string" }
  },
  "required": ["name"],
  "additionalProperties": {
    "type": "object",
    "properties": {
      "file": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "contains": { "$ref": "http://json-schema.org/draft/2020-12/schema#" }
        },
        "required": ["name", "contains"]
      }
    },
    "required": ["file"]
  }
}
```

This ensures:
- The schema adheres to JSON Schema Draft 2020-12.
- It has a unique identifier and description.
- It defines the structure for rules, each specifying a file and its expected content via a nested JSON Schema.

---

## Consumer JSON
The consumer JSON (the schema file used by the tool) must include:
- **"$schema"** (required): Points to the `$id` of the root schema (`"https://github.com/webarchitect/schemas/main/schema.json"`).
- **"name"** (required): A string identifying the specification name (e.g., `"webarchitect-v1"`).
- **Additional Properties**: Validation rules (e.g., `"biome"`, `"package"`), each with a `"file"` object containing `"name"` and `"contains"`.

### Example Consumer JSON
```json
{
  "$schema": "https://github.com/webarchitect/schemas/main/schema.json",
  "name": "webarchitect-v1",
  "biome": {
    "file": {
      "name": "biome.json",
      "contains": {
        "type": "object",
        "properties": {
          "extends": { "const": "@canonical/biome-config" }
        },
        "required": ["extends"],
        "additionalProperties": false
      }
    }
  },
  "package": {
    "file": {
      "name": "package.json",
      "contains": {
        "type": "object",
        "properties": {
          "type": { "const": "module" },
          "scripts": {
            "type": "object",
            "properties": {
              "build": { "type": "string" },
              "test": { "type": "string" }
            },
            "required": ["build", "test"]
          },
          "dependencies": {
            "type": "object",
            "properties": {
              "react": { "type": "string" }
            },
            "required": ["react"]
          }
        },
        "required": ["type", "scripts", "dependencies"]
      }
    }
  }
}
```

This consumer JSON:
- References the root schema via `"$schema"`.
- Specifies the specification name with `"name": "webarchitect-v1"`.
- Defines rules for validating `"biome.json"` and `"package.json"`.

---

## Tool Functionality

### 1. Command-Line Interface
The tool uses a flattened command-line interface:
- **Schema**: The schema to use, specified as a version identifier, local path, or remote URL.
- **--verbose (-v)**: Optional flag to display both passing and failing rules. Without it, only failing rules are shown.

#### Command Format
```
webarchitect [schema] [--verbose|-v]
```

#### Schema Resolution
The schema can be provided in three ways:
- **Version Identifier**: A string like `v2025/apps/react`, referencing a schema bundled with the tool.
- **Local Path**: A path to a local JSON file, such as `my/custom/schema`. The `.json` extension is optional.
- **Remote URL**: A URL starting with `http://` or `https://`, such as `https://some/schema.json`, where `.json` is required.

#### Resolution Logic
1. If the schema argument starts with `http://` or `https://`, it is treated as a remote URL and fetched directly.
2. Otherwise:
   - Check if the argument exists as a local file in the current working directory (as-is or with `.json` appended).
   - If the file exists, load it as the schema.
   - If not, treat the argument as a version identifier and look for a matching schema in the tool's bundled schemas (e.g., `schemas/v2025/apps/react.json` in the installation directory).
3. If the schema cannot be resolved or loaded, the tool exits with an error message.

#### Example Commands
- `webarchitect v2025/apps/react`: Checks locally for `v2025/apps/react(.json)`; if not found, uses the bundled schema `v2025/apps/react`.
- `webarchitect my/custom/schema`: Loads the local file `my/custom/schema` or `my/custom/schema.json` if it exists; otherwise, checks bundled schemas.
- `webarchitect https://some/schema.json`: Fetches the schema from the remote URL (`.json` required).
- `webarchitect v2025/apps/react --verbose`: Resolves the schema and shows both passing and failing rules.

### 2. Schema Loading
- **Local Loading**: Checks the current working directory for the schema file. If the provided path does not end with `.json`, it appends `.json` and checks again.
- **Bundled Schemas**: If not found locally, looks for a matching schema in the tool's installation directory under a `schemas/` folder.
- **Remote Fetching**: Uses HTTP/HTTPS to fetch the schema if a URL is provided (requires `.json` extension).
- **Validation**: Validates the loaded schema against the root schema (using `"$schema"`) to ensure correctness.

### 3. Module Validation
For each rule in the schema:
- Checks if the specified file exists in the module directory.
- If the file exists, parses its JSON content.
- Validates the parsed content against the `"contains"` JSON Schema.
- Collects validation results (pass/fail) for reporting.

### 4. Reporting
- **Default Mode**: Displays only failing rules with detailed error messages (e.g., missing files, invalid JSON, schema mismatches).
- **Verbose Mode (--verbose|-v)**: Displays both passing and failing rules, providing a comprehensive overview of the validation results.
- **Output Format**: Clear, actionable messages indicating which rules passed or failed and why.

---

## Example Schema and Validation

### Example Root Schema
```json
{
  "$schema": "http://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/webarchitect/schemas/main/schema.json",
  "description": "Schema for webarchitect",
  "type": "object",
  "properties": {
    "name": { "type": "string" }
  },
  "required": ["name"],
  "additionalProperties": {
    "type": "object",
    "properties": {
      "file": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "contains": { "$ref": "http://json-schema.org/draft/2020-12/schema#" }
        },
        "required": ["name", "contains"]
      }
    },
    "required": ["file"]
  }
}
```

### Example Consumer JSON
```json
{
  "$schema": "https://github.com/webarchitect/schemas/main/schema.json",
  "name": "webarchitect-v1",
  "biome": {
    "file": {
      "name": "biome.json",
      "contains": {
        "type": "object",
        "properties": {
          "extends": { "const": "@canonical/biome-config" }
        },
        "required": ["extends"],
        "additionalProperties": false
      }
    }
  },
  "package": {
    "file": {
      "name": "package.json",
      "contains": {
        "type": "object",
        "properties": {
          "type": { "const": "module" },
          "scripts": {
            "type": "object",
            "properties": {
              "build": { "type": "string" },
              "test": { "type": "string" }
            },
            "required": ["build", "test"]
          },
          "dependencies": {
            "type": "object",
            "properties": {
              "react": { "type": "string" }
            },
            "required": ["react"]
          }
        },
        "required": ["type", "scripts", "dependencies"]
      }
    }
  }
}
```

### Example Module Files
- **biome.json**:
  ```json
  {
    "extends": "@canonical/biome-config"
  }
  ```
- **package.json**:
  ```json
  {
    "type": "module",
    "scripts": {
      "build": "webpack",
      "test": "jest"
    },
    "dependencies": {
      "react": "^18.0.0"
    }
  }
  ```

### Validation Process
1. **Load Schema**: Resolves the schema source (local, bundled, or remote) and loads it.
2. **Validate Schema**: Ensures the consumer JSON conforms to the root schema via `"$schema"`.
3. **Rule: "biome"**:
   - Checks if `"biome.json"` exists.
   - Validates its content: Must have `"extends": "@canonical/biome-config"` and no extra properties.
4. **Rule: "package"**:
   - Checks if `"package.json"` exists.
   - Validates its content: Must have `"type": "module"`, `"scripts"` with `"build"` and `"test"`, and `"dependencies"` with `"react"`.
5. **Report**: In default mode, shows only failing rules (if any). In verbose mode, shows all rules with pass/fail status.

---

## Extensibility and Flexibility
- **Custom Rules**: Users can add new rules as additional properties in the consumer JSON, following the `"file"` structure.
- **Nested Validation**: The `"contains"` field leverages full JSON Schema capabilities for complex content validation.
- **Schema Sources**: Supports bundled, local, and remote schemas, offering flexibility for different use cases.

---

## Edge Cases and Error Handling
- **Missing Schema**: If the schema cannot be resolved or loaded, the tool exits with an error message.
- **Invalid Schema**: If the consumer JSON does not conform to the root schema, the tool reports a schema validation error.
- **Missing Files**: Reports an error if a specified file is not found.
- **Invalid JSON**: Flags files with malformed JSON content.
- **Schema Failures**: Details which properties fail to match the `"contains"` schema.
- **Extra Properties**: Rules can enforce strictness with `"additionalProperties": false`.
- **Extension Handling**: For local schemas, `.json` is optional; for remote schemas, it is required.

---

## Implementation Considerations
- **Schema Resolution**:
  - For remote URLs, fetch using HTTP/HTTPS and enforce `.json` extension.
  - For local paths, check existence as-is or with `.json` appended.
  - For version identifiers, map to bundled schemas in the tool's installation directory if not found locally.
- **Schema Validation**: Use a JSON Schema validator library (e.g., Ajv) to validate both the consumer JSON against the root schema and the file contents against the `"contains"` schemas.
- **File System**: Implement checks for file existence and JSON parsing.
- **Error Reporting**: Provide clear, actionable messages for debugging, with verbose output options.

---

## Conclusion
The "webarchitect" tool, with its updated specification, offers a robust and flexible solution for validating module architectures. By incorporating `$schema`, `$id`, and `description` in the root schema and ensuring consumer JSON files reference it with the renamed `"name"` field, the tool enforces consistency and correctness. Its streamlined consumption API, comprehensive validation, and flexible schema resolution make it an essential utility for maintaining architectural standards in development projects.

