import fs from "node:fs";
import { operations } from "./operations.js";
import { shi } from "./shi.js";

const parseArgs = (args: string[]) => {
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^-+/, ""); // Remove leading dashes (- or --)
    const value = args[i + 1];
    if (!value) {
      throw new Error(`Missing value for option: ${key}`);
    }
    options[key] = value;
  }
  return options;
};

const runCli = async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: shi <entity> <operation> [options]");
    process.exit(1);
  }

  const entity = args[0];
  const operation = args[1];
  const command = `${entity} ${operation}`;
  const shiEntity = shi[entity as keyof typeof shi];

  if (!shiEntity || !shiEntity[operation as keyof typeof shiEntity]) {
    console.error(`Invalid command: ${command}`);
    process.exit(1);
  }

  const op =
    operations[entity as keyof typeof operations]?.[
      operation as keyof (typeof operations)[entity]
    ];
  if (!op) {
    console.error(`Operation not found: ${command}`);
    process.exit(1);
  }

  const options = parseArgs(args.slice(2));
  const mappedOptions = Object.fromEntries(
    Object.entries(options).map(([key, value]) => {
      const opt = op.options.find((o) => o.shorthand === key || o.name === key);
      if (!opt) {
        throw new Error(`Unknown option: ${key}`);
      }
      const resolvedKey = opt.shorthand === key ? opt.name : key;
      return [
        resolvedKey,
        opt.type === "file" ? fs.readFileSync(value, "utf8") : value,
      ];
    }),
  );

  try {
    const result = await (
      shiEntity[operation as keyof typeof shiEntity] as any
    )(mappedOptions);
    console.log("Operation result:", result);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
};

runCli();
