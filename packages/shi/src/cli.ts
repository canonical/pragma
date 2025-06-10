import { parseArgs } from "util";
import { operations } from "./operations.js";
import { shi } from "./shi.js";

// Simple help generation from operations
const showHelp = () => {
  console.log("Usage: shi <entity> <operation> [options]\n");
  console.log("Commands:");

  for (const [entity, ops] of Object.entries(operations)) {
    for (const [opName, op] of Object.entries(ops)) {
      console.log(`  ${entity} ${opName} - ${op.description}`);
      for (const opt of op.options) {
        console.log(
          `    -${opt.shorthand}, --${opt.name} <${opt.type}>${opt.required ? " (required)" : ""}`,
        );
      }
      console.log();
    }
  }

  console.log("Global options:");
  console.log("  --provider <n>  LLM provider (openai, anthropic)");
  console.log("  --model <n>     Model to use");
  console.log("  -o, --output <file> Write output to file");
  console.log("  -q, --quiet        Suppress progress messages");
  console.log("  -h, --help         Show this help");
  console.log("  -v, --version      Show version");
};

// Main logic
const main = async () => {
  const args = Bun.argv.slice(2);

  // Quick check for help/version before parsing
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    showHelp();
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    const pkg = await Bun.file("package.json").json();
    console.log(pkg.version || "unknown");
    process.exit(0);
  }

  // We need at least entity and operation
  if (args.length < 2) {
    console.error("Error: Missing entity and operation");
    showHelp();
    process.exit(1);
  }

  const entity = args[0];
  const operation = args[1];

  // Validate command exists
  const shiEntity = shi[entity as keyof typeof shi];
  if (!shiEntity || !shiEntity[operation as keyof typeof shiEntity]) {
    console.error(`Error: Unknown command '${entity} ${operation}'`);
    process.exit(1);
  }

  const op =
    operations[entity as keyof typeof operations]?.[
      operation as keyof (typeof operations)[typeof entity]
    ];

  if (!op) {
    console.error(`Error: Operation not found '${entity} ${operation}'`);
    process.exit(1);
  }

  // Now parse args with knowledge of the operation
  const operationOptions: Record<string, any> = {};
  const globalOptions: Record<string, any> = {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
    output: { type: "string", short: "o" },
    provider: { type: "string" },
    model: { type: "string" },
    quiet: { type: "boolean", short: "q" },
  };

  // Add operation-specific options
  for (const opt of op.options) {
    operationOptions[opt.name] = {
      type: "string" as const,
      short: opt.shorthand,
    };
  }

  // Parse all args together
  const { values } = parseArgs({
    args: args.slice(2), // Skip entity and operation
    options: { ...operationOptions, ...globalOptions },
    strict: false,
  });

  // Build options object
  const options: Record<string, string> = {};

  // Map operation options
  for (const opt of op.options) {
    const value = values[opt.name];
    if (opt.required && !value) {
      console.error(`Error: Missing required option --${opt.name}`);
      process.exit(1);
    }
    if (value) {
      options[opt.name] =
        opt.type === "file"
          ? await Bun.file(value as string).text()
          : (value as string);
    }
  }

  // Add global options
  if (values.provider) options.provider = values.provider as string;
  if (values.model) options.model = values.model as string;

  // Execute
  if (!values.quiet) {
    console.log(`Executing ${entity} ${operation}...`);
  }

  try {
    const result = await (
      shiEntity[operation as keyof typeof shiEntity] as any
    )(options);
    const output =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);

    if (values.output) {
      await Bun.write(values.output as string, output);
      console.log(`Output written to ${values.output}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
};

main().catch(console.error);
