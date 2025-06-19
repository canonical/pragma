import { readFile } from "node:fs/promises";
import { join } from "node:path";
import ajv from "./ajv.js";
import motherSchema from "./schema.json" with { type: "json" };
import type { Schema } from "./types.js";

const validateSchema = ajv.compile(motherSchema);

export default async function resolveSchema(
	schemaArg: string,
): Promise<Schema> {
	let schemaData: Schema;
	if (schemaArg.startsWith("http://") || schemaArg.startsWith("https://")) {
		const response = await fetch(schemaArg);
		schemaData = (await response.json()) as Schema;
	} else {
		let schemaPath = schemaArg;
		if (!schemaPath.endsWith(".json")) {
			schemaPath += ".json";
		}
		try {
			schemaData = JSON.parse(await readFile(schemaPath, "utf-8"));
		} catch (e) {
			const bundledPath = join(__dirname, "../rulesets", schemaPath);
			try {
				schemaData = JSON.parse(await readFile(bundledPath, "utf-8"));
			} catch (bundledError) {
				throw new Error(
					`Could not find ruleset: '${schemaArg}'. ` +
						`Checked local path '${schemaPath}' and bundled path '${bundledPath}'. ` +
						`Ensure the ruleset exists or use a valid URL. Available bundled rulesets: base, package, package-react`,
				);
			}
		}
	}
	if (!validateSchema(schemaData)) {
		throw new Error(
			`Invalid ruleset: ${JSON.stringify(validateSchema.errors)}`,
		);
	}
	return schemaData;
}
