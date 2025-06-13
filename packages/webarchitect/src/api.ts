import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Ajv from "ajv";
import type { ValidationResult } from "./types.js";
import validateProject from "./validateProject.js";

const ajv = new Ajv();

// Load the mother schema
let motherSchema: any;
(async () => {
	motherSchema = JSON.parse(
		await readFile(join(__dirname, "schema.json"), "utf-8"),
	);
})();

const validateSchema = ajv.compile(motherSchema);

async function resolveSchema(schemaArg: string): Promise<any> {
	let schemaData;
	if (schemaArg.startsWith("http://") || schemaArg.startsWith("https://")) {
		const response = await fetch(schemaArg);
		schemaData = await response.json();
	} else {
		let schemaPath = schemaArg;
		if (!schemaPath.endsWith(".json")) {
			schemaPath += ".json";
		}
		try {
			schemaData = JSON.parse(await readFile(schemaPath, "utf-8"));
		} catch (e) {
			const bundledPath = join(__dirname, "../rulesets", schemaPath);
			schemaData = JSON.parse(await readFile(bundledPath, "utf-8"));
		}
	}
	if (!validateSchema(schemaData)) {
		throw new Error(
			`Invalid schema:  ${JSON.stringify(validateSchema.errors)}`,
		);
	}
	return schemaData;
}

async function loadFullSchema(schemaArg: string): Promise<any> {
	const schema = await resolveSchema(schemaArg);
	if (schema.extends) {
		const baseSchemas = await Promise.all(schema.extends.map(loadFullSchema));
		const baseRules = baseSchemas.reduce((acc, s) => {
			const { $schema, name, extends: _, ...rules } = s;
			return { ...acc, ...rules };
		}, {});
		const { $schema, name, extends: _, ...rules } = schema;
		return { ...baseRules, ...rules, $schema, name };
	}
	return schema;
}

export async function validate(
	projectPath: string,
	schemaArg: string,
): Promise<ValidationResult[]> {
	const schema = await loadFullSchema(schemaArg);
	return validateProject(projectPath, schema);
}

export { validateProject };
