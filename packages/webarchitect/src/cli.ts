#!/usr/bin/env node
import type { ErrorObject } from "ajv";
import chalk from "chalk";
import { Command } from "commander";
import type { ValidationResult } from "./types.js";
import validate from "./validate.js";

const program = new Command();

/**
 * Formats AJV validation errors into human-readable messages.
 * Groups errors by their property path and removes duplicate messages.
 *
 * @param errorsJson - JSON string containing an array of AJV ErrorObject instances
 * @returns Array of formatted error messages, one per property path
 *
 * @example
 * ```typescript
 * const errors = '[{"instancePath": "/name", "message": "must be string"}]';
 * const formatted = formatAjvErrors(errors);
 * // Returns: ["name: must be string"]
 * ```
 */
function formatAjvErrors(errorsJson: string): string[] {
  try {
    const errors = JSON.parse(errorsJson) as ErrorObject[];
    const errorsByPath = new Map<string, Set<string>>();

    for (const error of errors) {
      const path = error.instancePath || "root";
      const message = error.message || "validation failed";

      if (!errorsByPath.has(path)) {
        errorsByPath.set(path, new Set());
      }
      // Use optional chaining for safety
      errorsByPath.get(path)?.add(message);
    }

    return Array.from(errorsByPath.entries()).map(([path, messages]) => {
      const property = path === "root" ? "file" : path.replace("/", "");
      const messageList = Array.from(messages).join(", ");
      return `${property}: ${messageList}`;
    });
  } catch {
    // Fallback if JSON parsing fails
    return [errorsJson];
  }
}

/**
 * Formats validation results for terminal output with color coding.
 * Displays failed validations first, followed by passed validations,
 * and ends with a summary. In verbose mode, shows additional context
 * including file contents and validation rules.
 *
 * @param results - Array of validation results to format
 * @param verbose - Whether to show detailed information including file contents and rules
 *
 * @example
 * ```typescript
 * const results = [
 *   { rule: "package.json", passed: true },
 *   { rule: "biome.json", passed: false, message: "File not found" }
 * ];
 * formatTerminalOutput(results, true);
 * ```
 */
function formatTerminalOutput(
  results: ValidationResult[],
  verbose = false,
): void {
  console.log(); // Empty line for spacing

  const passedResults = results.filter((r) => r.passed);
  const failedResults = results.filter((r) => !r.passed);

  if (failedResults.length > 0) {
    console.log(chalk.red.bold("✗ FAILED VALIDATIONS"));
    console.log(chalk.gray("─".repeat(50)));

    for (const result of failedResults) {
      console.log(chalk.red(`✗ ${result.rule}`));

      if (verbose && result.context) {
        console.log(chalk.gray(`  Target: ${result.context.target}`));
        if (result.context.description) {
          console.log(chalk.gray(`  Rule: ${result.context.description}`));
        }
      }

      if (result.message) {
        // Check if message contains JSON (AJV errors)
        if (result.message.includes("Validation failed: [")) {
          const jsonStart = result.message.indexOf("[");
          const prefix = result.message.substring(0, jsonStart).trim();
          const jsonPart = result.message.substring(jsonStart);

          if (prefix) {
            console.log(chalk.gray(`  ${prefix}`));
          }

          const formattedErrors = formatAjvErrors(jsonPart);
          for (const error of formattedErrors) {
            console.log(chalk.gray(`  • ${error}`));
          }
        } else {
          console.log(chalk.gray(`  ${result.message}`));
        }
      }

      if (
        verbose &&
        result.context?.value &&
        result.context.value !== "[File not found]"
      ) {
        // Use regular string instead of template literal where no interpolation needed
        console.log(chalk.gray("  Found:"));
        if (typeof result.context.value === "object") {
          const preview = JSON.stringify(result.context.value, null, 2)
            .split("\n")
            .slice(0, 10) // Show first 10 lines
            .map((line) => `    ${line}`)
            .join("\n");
          console.log(chalk.gray(preview));
          if (JSON.stringify(result.context.value).split("\n").length > 10) {
            console.log(chalk.gray("    ... (truncated)"));
          }
        } else {
          console.log(chalk.gray(`    ${result.context.value}`));
        }
      }
      console.log(); // Empty line between failures
    }
  }

  if (passedResults.length > 0) {
    console.log(chalk.green.bold("✓ PASSED VALIDATIONS"));
    console.log(chalk.gray("─".repeat(50)));

    for (const result of passedResults) {
      console.log(chalk.green(`✓ ${result.rule}`));

      if (verbose && result.context) {
        console.log(chalk.gray(`  Target: ${result.context.target}`));
        if (result.context.description) {
          console.log(chalk.gray(`  Rule: ${result.context.description}`));
        }

        if (result.context.value && typeof result.context.value === "object") {
          // Use regular string instead of template literal
          console.log(chalk.gray("  Validated content:"));
          const preview = JSON.stringify(result.context.value, null, 2)
            .split("\n")
            .slice(0, 5) // Show fewer lines for passed validations
            .map((line) => `    ${line}`)
            .join("\n");
          console.log(chalk.gray(preview));
          if (JSON.stringify(result.context.value).split("\n").length > 5) {
            console.log(chalk.gray("    ... (content validated successfully)"));
          }
        }
      }
    }
    console.log();
  }

  // Summary
  const total = results.length;
  const failed = failedResults.length;
  const passed = passedResults.length;

  if (failed > 0) {
    console.log(
      chalk.red.bold(
        `Summary: ${failed}/${total} validations failed (${passed} passed)`,
      ),
    );
  } else {
    console.log(chalk.green.bold(`Summary: All ${total} validations passed`));
  }
}

/**
 * Formats validation results as JSON for programmatic consumption.
 * Outputs a structured object with summary statistics and detailed results.
 *
 * @param results - Array of validation results to format
 *
 * @example
 * ```typescript
 * const results = [
 *   { rule: "package.json", passed: true },
 *   { rule: "biome.json", passed: false, message: "File not found" }
 * ];
 * formatJsonOutput(results);
 * // Outputs: {
 * //   "summary": { "total": 2, "passed": 1, "failed": 1 },
 * //   "results": [...]
 * // }
 * ```
 */
function formatJsonOutput(results: ValidationResult[]): void {
  const output = {
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    },
    results: results.map((result) => ({
      rule: result.rule,
      passed: result.passed,
      ...(result.message && { message: result.message }),
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

program
  .name("webarchitect")
  .argument("<ruleset>", "ruleset identifier, local path, or URL")
  .option("-v, --verbose", "show all validation results")
  .option("--json", "output results in JSON format")
  .action(async (schemaArg, options) => {
    try {
      const results = await validate(process.cwd(), schemaArg);

      if (options.json) {
        formatJsonOutput(results);
      } else {
        formatTerminalOutput(results, options.verbose);

        // Exit with error code if any validations failed
        const hasFailures = results.some((r) => !r.passed);
        if (hasFailures) {
          process.exit(1);
        }
      }
    } catch (e) {
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              error: (e as Error).message,
              success: false,
            },
            null,
            2,
          ),
        );
      } else {
        console.error(chalk.red(`Error: ${(e as Error).message}`));
      }
      process.exit(1);
    }
  });

program.parse();
