#!/usr/bin/env node
import { Command } from "commander";
import validate from "./validate.js";

const program = new Command();

program
  .name("webarchitect")
  .argument("<schema>", "schema identifier, local path, or URL")
  .option("-v, --verbose", "show all validation results")
  .action(async (schemaArg, options) => {
    try {
      const results = await validate(process.cwd(), schemaArg);
      for (const result of results) {
        if (result.passed) {
          console.log(`${result.rule}: passed`);
        } else {
          console.log(`${result.rule}: failed - ${result.message}`);
        }
      }
    } catch (e) {
      console.error(`Error: ${(e as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
