import type { Schema, VariableDeclarations } from "../types.js";
import ajv from "./ajv.js";

// Matches `${name}` placeholders within rule strings.
const TOKEN_PATTERN = /\$\{([^}]+)\}/g;

/**
 * Formats a set of variable names for inclusion in error messages.
 *
 * @param names - Declared variable names
 * @returns A comma-separated list, or "none" when empty
 */
function declaredList(names: string[]): string {
  return names.join(", ") || "none";
}

/**
 * Replaces every `${name}` token in a string with its resolved value.
 * Throws if a token references a variable that was never declared, which
 * surfaces ruleset typos instead of silently leaving the placeholder in place.
 *
 * @param value - String that may contain one or more `${name}` tokens
 * @param values - Map of resolved variable names to their string values
 * @returns The string with all tokens substituted
 * @throws Will throw if a token references an undeclared variable
 */
function replaceTokens(value: string, values: Record<string, string>): string {
  return value.replace(TOKEN_PATTERN, (_match, name: string) => {
    if (!(name in values)) {
      throw new Error(
        `Unknown template variable '\${${name}}'. Declared variables: ${declaredList(Object.keys(values))}`,
      );
    }
    return values[name];
  });
}

/**
 * Recursively walks an arbitrary JSON value, substituting `${name}` tokens in
 * every string it encounters. Returns a new value; the input is not mutated.
 *
 * @param value - Any JSON-compatible value (object, array, string, primitive)
 * @param values - Map of resolved variable names to their string values
 * @returns A structurally identical value with all string tokens substituted
 */
function deepSubstitute(
  value: unknown,
  values: Record<string, string>,
): unknown {
  if (typeof value === "string") {
    return replaceTokens(value, values);
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepSubstitute(item, values));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        deepSubstitute(item, values),
      ]),
    );
  }
  return value;
}

/**
 * Resolves declared variables against CLI-provided overrides and validates the
 * resulting values. Override values win over declared defaults, and any
 * variable that declares a `schema` is validated against it using AJV.
 *
 * @param declarations - Variable declarations from the merged ruleset
 * @param overrides - Variable values supplied via `--var` / `--prefix`
 * @returns Map of variable name to its final, validated string value
 * @throws Will throw if an override targets an undeclared variable or fails its schema
 */
function resolveValues(
  declarations: VariableDeclarations,
  overrides: Record<string, string>,
): Record<string, string> {
  // Reject overrides that target undeclared variables (typo or wrong ruleset).
  for (const key of Object.keys(overrides)) {
    if (!(key in declarations)) {
      throw new Error(
        `Unknown variable '${key}' provided via --var/--prefix. Declared variables: ${declaredList(Object.keys(declarations))}`,
      );
    }
  }

  const values: Record<string, string> = {};
  for (const [name, declaration] of Object.entries(declarations)) {
    const value = name in overrides ? overrides[name] : declaration.default;

    // ajv.validate caches compiled schemas by object reference; fine here since
    // this runs once per CLI invocation over a handful of small value schemas.
    if (declaration.schema && !ajv.validate(declaration.schema, value)) {
      throw new Error(
        `Invalid value '${value}' for variable '${name}': ${ajv.errorsText(ajv.errors)}`,
      );
    }

    values[name] = value;
  }

  return values;
}

/**
 * Substitutes `${name}` template variables throughout a ruleset's rules.
 * Variables are declared under the ruleset's `variables` block (with defaults
 * and optional value schemas) and can be overridden at the command line. The
 * returned schema has all tokens resolved and the `variables` block removed,
 * leaving a plain ruleset ready for rule execution.
 *
 * Must run after `loadFullSchema` (so inherited variables and rules are merged)
 * and before `executeValidationRules` (so rule regexes are compiled with their
 * final values rather than raw `${name}` tokens).
 *
 * @param schema - Fully merged ruleset, optionally containing a `variables` block
 * @param overrides - Variable values supplied via `--var` / `--prefix`
 * @returns A new ruleset with tokens substituted and `variables` stripped
 * @throws Will throw on undeclared overrides, failed value schemas, or unknown tokens
 *
 * @example
 * ```typescript
 * const schema = {
 *   name: "library",
 *   variables: { prefix: { default: "@canonical/" } },
 *   "package-structure": {
 *     file: { name: "package.json", contains: {
 *       properties: { name: { type: "string", pattern: "^${prefix}" } }
 *     } }
 *   }
 * };
 * substituteVariables(schema, { prefix: "@myorg/" });
 * // package name pattern becomes "^@myorg/"
 * ```
 */
export default function substituteVariables(
  schema: Schema,
  overrides: Record<string, string> = {},
): Schema {
  const declarations = schema.variables ?? {};
  const values = resolveValues(declarations, overrides);

  const { variables: _variables, ...rules } = schema;
  return deepSubstitute(rules, values) as Schema;
}
