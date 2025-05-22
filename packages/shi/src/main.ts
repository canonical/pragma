#!/usr/bin/env bun

import * as fs from "node:fs";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

// Platform extensions
const PLATFORM_EXTENSIONS: Record<string, string> = {
	react: "tsx",
	svelte: "svelte",
};

// Prompt templates for LLM
const PROMPT_IDS: { [key: string]: string } = {
	specification_create:
		'Given the following JSON schema: {schema}, the component name: {name}, and the description: {description}, generate a JSON object that conforms to the schema, includes the "name" field set to "{name}", and matches the description. Return only the JSON object.',
	implementation_create:
		"Generate a {platform} component that conforms to the following specification: {specification}. Return only the code.",
	implementation_improve:
		"Generate an improved {platform} component that conforms to the following specification: {specification} and also addresses the following: {description}. Return only the code.",
	implementation_verify:
		"Given the following component specification: {specification}, and the following code: {code}, does the code implement the specification correctly? Provide a yes/no answer and an explanation.",
};

// Argument type definition
type ArgType = "string" | "number" | "boolean" | "file";

// Argument declaration structure
interface ArgDeclaration {
	name: string;
	type: ArgType;
	required: boolean;
}

// Abstract Command class
abstract class Command {
	protected args: string[];
	protected options: Record<string, string | number | boolean> = {};
	protected argDeclarations: ArgDeclaration[];

	constructor(args: string[], argDeclarations: ArgDeclaration[]) {
		this.args = args;
		this.argDeclarations = argDeclarations;
		this.parseOptions();
	}

	private parseOptions() {
		const argMap: Record<string, string> = {};
		for (let i = 2; i < this.args.length; i += 2) {
			const key = this.args[i].replace("--", "");
			const value = this.args[i + 1];
			argMap[key] = value;
		}

		for (const decl of this.argDeclarations) {
			const value = argMap[decl.name];
			if (decl.required && value === undefined) {
				throw new Error(`Missing required option: --${decl.name}`);
			}
			if (value !== undefined) {
				switch (decl.type) {
					case "string":
						this.options[decl.name] = value;
						break;
					case "number":
						this.options[decl.name] = Number(value);
						break;
					case "boolean":
						this.options[decl.name] = value === "true";
						break;
					case "file":
						this.options[decl.name] = fs.readFileSync(value, "utf8");
						break;
				}
			}
		}
	}

	protected fillTemplate(
		template: string,
		params: Record<string, string>,
	): string {
		return template.replace(/\{(\w+)\}/g, (_, key) => params[key] || "");
	}

	protected async callLLM(
		promptId: string,
		params: Record<string, string>,
	): Promise<string> {
		const prompt = this.fillTemplate(PROMPT_IDS[promptId], params);
		const provider = process.env.LLM_PROVIDER || "openai";
		let model: ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI;

		switch (provider) {
			case "openai":
				model = new ChatOpenAI({
					apiKey: process.env.OPENAI_API_KEY,
					model: "gpt-4.1",
				});
				break;
			case "anthropic":
				model = new ChatAnthropic({
					apiKey: process.env.ANTHROPIC_API_KEY,
					model: "claude-3-sonnet-20240229",
				});
				break;
			case "google":
				model = new ChatGoogleGenerativeAI({
					apiKey: process.env.GOOGLE_API_KEY,
					model: "gemini-pro",
				});
				break;
			default:
				throw new Error(`Unsupported LLM provider: ${provider}`);
		}

		const response = await model.invoke([{ role: "user", content: prompt }]);
		return response.content.toString().trim();
	}

	protected getComponentName(specContent: string): string {
		const spec = JSON.parse(specContent);
		const name = spec.name;
		if (!name) {
			throw new Error('Specification must contain a "name" field');
		}
		return name;
	}

	protected getExtension(platform: string): string {
		const extension = PLATFORM_EXTENSIONS[platform];
		if (!extension) {
			throw new Error(`Unsupported platform: ${platform}`);
		}
		return extension;
	}

	abstract execute(): Promise<void>;
}

// Specification Create Command
class SpecificationCreateCommand extends Command {
	constructor(args: string[]) {
		super(args, [
			{ name: "name", type: "string", required: true },
			{ name: "schema", type: "file", required: true },
			{ name: "description", type: "string", required: true },
		]);
	}

	async execute() {
		const name = this.options.name as string;
		const schemaContent = this.options.schema as string;
		const description = this.options.description as string;

		const response = await this.callLLM("specification_create", {
			schema: schemaContent,
			name,
			description,
		});
		const jsonObject = JSON.parse(response);
		fs.writeFileSync(`${name}.json`, JSON.stringify(jsonObject, null, 2));
	}
}

// Implementation Create Command
class ImplementationCreateCommand extends Command {
	constructor(args: string[]) {
		super(args, [
			{ name: "object", type: "file", required: true },
			{ name: "platform", type: "string", required: true },
		]);
	}

	async execute() {
		const specContent = this.options.object as string;
		const platform = this.options.platform as string;

		const componentName = this.getComponentName(specContent);
		const extension = this.getExtension(platform);

		const response = await this.callLLM("implementation_create", {
			specification: specContent,
			platform,
		});
		fs.writeFileSync(`${componentName}.${extension}`, response);
	}
}

// Implementation Improve Command
class ImplementationImproveCommand extends Command {
	constructor(args: string[]) {
		super(args, [
			{ name: "object", type: "file", required: true },
			{ name: "platform", type: "string", required: true },
			{ name: "description", type: "string", required: true },
		]);
	}

	async execute() {
		const specContent = this.options.object as string;
		const platform = this.options.platform as string;
		const description = this.options.description as string;

		const componentName = this.getComponentName(specContent);
		const extension = this.getExtension(platform);

		const response = await this.callLLM("implementation_improve", {
			specification: specContent,
			platform,
			description,
		});
		fs.writeFileSync(`${componentName}.improved.${extension}`, response);
	}
}

// Implementation Verify Command
class ImplementationVerifyCommand extends Command {
	constructor(args: string[]) {
		super(args, [
			{ name: "object", type: "file", required: true },
			{ name: "component", type: "file", required: true },
		]);
	}

	async execute() {
		const specContent = this.options.object as string;
		const codeContent = this.options.component as string;

		const response = await this.callLLM("implementation_verify", {
			specification: specContent,
			code: codeContent,
		});
		console.log(response);
	}
}

// Command mapping
const commandMap: Record<string, new (args: string[]) => Command> = {
	"specification create": SpecificationCreateCommand,
	"implementation create": ImplementationCreateCommand,
	"implementation improve": ImplementationImproveCommand,
	"implementation verify": ImplementationVerifyCommand,
};

// Main execution
async function main() {
	const args = process.argv.slice(2);
	if (args.length < 2) {
		console.error("Usage: bun mytool.ts <command> <subcommand> [options]");
		process.exit(1);
	}

	const commandName = `${args[0]} ${args[1]}`;
	const CommandClass = commandMap[commandName];
	if (!CommandClass) {
		console.error(`Invalid command: ${commandName}`);
		process.exit(1);
	}

	const command = new CommandClass(args);
	await command.execute();
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
