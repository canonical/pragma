# Webarchitect

A powerful command-line tool for validating project architecture and configuration consistency across development teams and organizations.

## What is this tool for?

Webarchitect helps development teams maintain consistent project structures and configuration standards. Think of it as a quality gate that ensures every project in your organization follows the same architectural patterns, uses the same build tools, and maintains the same configuration standards.

### The Problem It Solves

In large organizations with multiple development teams, projects tend to drift from established standards over time. One team might use different TypeScript configurations, another might have inconsistent package.json structures, and a third might be missing essential development scripts. This inconsistency creates several problems: developers waste time figuring out how each project works, code quality varies between teams, and maintaining projects becomes more difficult as each one follows slightly different patterns.

Webarchitect addresses this challenge by providing automated validation of project architecture. Instead of relying on documentation that might become outdated or manual code reviews that might miss configuration details, you can define your organization's standards as executable rulesets and validate projects automatically.

### How It Works

The tool operates on the concept of "rulesets" - JSON Schema-based definitions that describe what files should exist in a project and what those files should contain. For example, a ruleset might specify that every package must have a `package.json` file with specific required fields, a `biome.json` file that extends your organization's linting configuration, and a TypeScript configuration that follows your team's standards.

When you run webarchitect against a project, it loads the specified ruleset, checks whether the required files exist, and validates that their contents match the expected structure and values. This approach gives you confidence that projects follow your established patterns without requiring manual inspection.

## How to install and run?

### Installation

First, install webarchitect as a dependency in your project or globally:

```bash
# Using npm
npm install --save-dev @canonical/webarchitect

# Using bun
bun add --dev @canonical/webarchitect
```

For global installation:

```bash
# Using npm
npm install -g @canonical/webarchitect

# Using bun
bun add -g @canonical/webarchitect
```

### Basic Usage

The most straightforward way to get started is by validating your project against the `base-package` ruleset, which enforces common standards for package structure and configuration:

```bash
# Using node
npx webarchitect base-package

# Using bun 
bun run webarchitect base-package
```

This command will check your current directory against the base package requirements, validating that your project has the expected configuration files and that they contain the required fields and values.

### Understanding the Output

When you run webarchitect, you'll see a clear summary of which validations passed and which failed. Failed validations include detailed explanations of what was expected versus what was found, making it easy to understand how to fix any issues.

For more detailed information about what's being validated, add the verbose flag:

```bash
npx webarchitect base-package --verbose
```

The verbose output shows you exactly which files are being checked, what rules are being applied, and what content was found in each file.

## What are the available rulesets?

Webarchitect comes with several built-in rulesets that cover common project patterns. You can find all available rulesets in the [rulesets folder](./rulesets) of this repository.

### Built-in Rulesets

- `base`: The foundational ruleset that contains minimal requirements for any project. This is currently empty and should not be used. In the future, this ruleset will include license file validation and will serve as a building block for more specific rulesets.

- `base-package`: Extends the base ruleset with comprehensive package requirements. This ruleset validates that your package.json contains required fields like name, version, type, and scripts, ensures consistent module structure with specific entry points, validates biome.json configuration for code formatting and linting, and enforces the use of ES modules and TypeScript.

- `package-react`: - Extends base-package with React-specific requirements. This ruleset includes all the base package validations plus verification that React 19 or higher is specified as a dependency, ensuring your React projects use compatible versions. 

### Ruleset Inheritance

Rulesets can extend other rulesets, creating a hierarchy of validation requirements. For example, package-react extends base-package, which extends base. This means when you validate against package-react, you're actually running all three sets of rules. This inheritance model allows you to build complex validation requirements while keeping individual rulesets focused and maintainable.

### Creating Custom Rulesets

Webarchitect uses standard JSON Schema as its validation engine, but applies it in a specialized way. Instead of directly validating data against schemas, webarchitect creates a meta-usage of JSON Schema where the schemas themselves describe validation rules for project files.

Understanding this architecture requires grasping the concept of the "mother schema" - a master JSON Schema definition that validates the structure of webarchitect rulesets themselves. This mother schema defines what properties a valid ruleset can have, how file and directory rules should be structured, and what inheritance patterns are allowed. When you create a custom ruleset, webarchitect first validates your ruleset definition against this mother schema before using your rules to validate project files.

You can create custom rulesets by following the JSON Schema format used by the built-in examples. The [JSON Schema documentation](https://json-schema.org/learn/) provides comprehensive guidance on writing schema definitions. Custom rulesets can extend existing ones or define completely new validation requirements for your specific organizational needs.

This approach gives you the full power of JSON Schema's validation capabilities while maintaining a consistent structure for how validation rules are defined and applied across different projects and teams.

## CLI API

Webarchitect provides a simple but powerful command-line interface designed to integrate easily into development workflows and CI/CD pipelines. The tool must be run from the top-level directory of your package - the same directory that contains your package.json file - to properly validate your project structure.

### Basic Command Structure

```bash
webarchitect <ruleset> [options]
```

### Available Options

- `--verbose`: Shows detailed information about each validation, including what files are being checked, what rules are being applied, and the actual content found. Essential for debugging validation failures or understanding exactly what the tool is checking.
-`--json`: Outputs results in JSON format instead of human-readable text. Required for integrating webarchitect into automated systems, CI/CD pipelines, or other tools that need to programmatically process validation results.
-`--help`: Displays comprehensive usage information, available options, and examples. Use this command to see the most current information about the tool's capabilities.

### Ruleset Resolution Mechanism

The `<ruleset>` parameter follows a specific resolution order that determines where webarchitect looks for ruleset definitions:

1. **Local Files First** - Webarchitect first checks the current directory for a file matching your ruleset name. If you specify `my-rules`, it looks for `my-rules.json` in the current directory. This allows you to override built-in rulesets or use project-specific validation rules.

2. **Bundled Rulesets Second** - If no local file is found, webarchitect searches its internal collection of built-in rulesets. These include `base`, `base-package`, and `package-react`. Built-in rulesets are distributed with the tool and provide standard validation patterns for common project types.

3. **Remote URLs** - You can also specify a complete URL (starting with `http://` or `https://`) to fetch rulesets from remote locations. Remote rulesets must end with `.json` and be accessible via standard HTTP requests. This enables sharing rulesets across organizations or using centrally managed validation rules.

This resolution mechanism allows teams to start with built-in rulesets, customize them locally as needed, and eventually move to centralized remote rulesets as their validation requirements mature and become standardized across larger organizations.

### Exit Codes

Webarchitect follows standard Unix conventions for exit codes. It returns 0 when all validations pass and 1 when any validation fails. This makes it easy to integrate into scripts and CI/CD pipelines where you want builds to fail if architectural standards aren't met.

## Programmatic API

While the command-line interface covers most use cases, webarchitect also provides a programmatic API for integration into build tools, custom scripts, or other Node.js applications.

### Basic Usage Example

```typescript
import { validate } from '@canonical/webarchitect';
import type { ValidationResult } from '@canonical/webarchitect';

// Validate the current directory against a ruleset
async function checkProjectCompliance(): Promise<void> {
  try {
    // The validate function takes a project path and ruleset identifier
    const results: ValidationResult[] = await validate(process.cwd(), 'base-package');
    
    // Process the results
    for (const result of results) {
      if (result.passed) {
        console.log(`✓ ${result.rule}: passed`);
      } else {
        console.log(`✗ ${result.rule}: ${result.message}`);
      }
    }
    
    // Check if any validations failed
    const hasFailures: boolean = results.some(result => !result.passed);
    if (hasFailures) {
      throw new Error('Project does not meet architectural standards');
    }
    
    console.log('All validations passed!');
  } catch (error) {
    console.error('Validation failed:', (error as Error).message);
    process.exit(1);
  }
}

checkProjectCompliance();
```

### Advanced Usage with Custom Error Handling

```typescript
import { validate } from '@canonical/webarchitect';
import type { ValidationResult } from '@canonical/webarchitect';

interface ValidationReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    success: boolean;
  };
  details: {
    passed: Array<{ rule: string; target?: string }>;
    failed: Array<{ rule: string; message?: string; target?: string }>;
  };
}

async function validateWithDetailedReporting(
  projectPath: string, 
  rulesetName: string
): Promise<ValidationReport> {
  try {
    const results: ValidationResult[] = await validate(projectPath, rulesetName);
    
    // Separate passed and failed results
    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);
    
    // Generate a detailed report
    const report: ValidationReport = {
      summary: {
        total: results.length,
        passed: passed.length,
        failed: failed.length,
        success: failed.length === 0
      },
      details: {
        passed: passed.map(r => ({ rule: r.rule, target: r.context?.target })),
        failed: failed.map(r => ({ 
          rule: r.rule, 
          message: r.message,
          target: r.context?.target 
        }))
      }
    };
    
    return report;
  } catch (error) {
    throw new Error(`Failed to validate project: ${(error as Error).message}`);
  }
}

// Usage in a build script
validateWithDetailedReporting('./my-project', 'base-package')
  .then((report: ValidationReport) => {
    if (report.summary.success) {
      console.log('✅ Project validation successful');
    } else {
      console.log('❌ Project validation failed');
      console.log(`Failed rules: ${report.details.failed.length}`);
      report.details.failed.forEach(failure => {
        console.log(`  - ${failure.rule}: ${failure.message}`);
      });
    }
  })
  .catch((error: Error) => {
    console.error('Validation error:', error.message);
  });
```

### Integration with Build Tools

The programmatic API makes it easy to integrate webarchitect into existing build processes. You can add validation steps to webpack configurations, gulp tasks, or any other build system that supports Node.js plugins.

## Known caveats?

- **Plain Text File Validation** - Webarchitect only validates JSON files. While it can verify that plain text files like LICENSE or README.md exist, it cannot validate their contents. This limitation affects license text verification, documentation standards, and configuration files that use non-JSON formats.
- **IDE Integration** - No real-time validation feedback is available yet in code editors. Developers must run webarchitect manually or through build scripts to see validation results. Real-time diagnostics would require Language Server Protocol implementation or editor-specific plugins.
- **Svelte support** - No svelte-specific ruleset has been developed yet.
- **Error Code Granularity** - All validation failures return the same exit code (1) regardless of failure type. Missing files, invalid JSON syntax, and schema validation failures are not distinguished programmatically. This limits automated error handling and reporting capabilities.
 
