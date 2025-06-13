import { Command } from "commander";
import { validate } from "./api.js";

const program = new Command();

program
	.name("webarchitect")
	.argument("<schema>", "schema identifier, local path, or URL")
	.option("-v, --verbose", "show all validation results")
	.action(async (schemaArg, options) => {
		try {
			const results = await validate(process.cwd(), schemaArg);
			results.forEach((result) => {
				if (result.passed) {
					console.log(`${result.rule}: passed`);
				} else {
					console.log(`${result.rule}: failed - ${result.message}`);
				}
			});
		} catch (e) {
			console.error(`Error: ${e.message}`);
			process.exit(1);
		}
	});

program.parse();
