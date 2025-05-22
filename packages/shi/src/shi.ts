import fs from "node:fs";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { type Operation, operations } from "./operations";

// Default models for each provider
const defaultModels = {
	openai: "gpt-4.1-nano",
	anthropic: "claude-3.5-sonnet",
};

// Updated getLLM with optional model and provider-based defaults
const getLLM = (provider: string, model?: string) => {
	const selectedModel = model || defaultModels[provider];
	if (!selectedModel) {
		throw new Error(
			`No model specified and no default for provider: ${provider}`,
		);
	}
	switch (provider) {
		case "openai":
			return new ChatOpenAI({
				apiKey: process.env.OPENAI_API_KEY,
				modelName: selectedModel,
			});
		case "anthropic":
			return new ChatAnthropic({
				apiKey: process.env.ANTHROPIC_API_KEY,
				modelName: selectedModel,
			});
		default:
			throw new Error(`Unsupported LLM provider: ${provider}`);
	}
};

// Define global options with shorthands
const globalOptions = [
	{ name: "provider", shorthand: "p", type: "string" },
	{ name: "model", shorthand: "m", type: "string" },
	{ name: "out", shorthand: "o", type: "string" },
];

// Map operation-specific shorthands
const mapShorthands = (
	op: Operation,
	options: Record<string, string>,
): Record<string, string> => {
	const shorthandMap = Object.fromEntries(
		op.options.map((opt) => [opt.shorthand, opt.name]),
	);
	return Object.fromEntries(
		Object.entries(options).map(([key, value]) => [
			shorthandMap[key] || key,
			value,
		]),
	);
};

// Factory function to create operation handlers
const createShiFunction =
	(op: Operation) => async (options: Record<string, string>) => {
		// Map global shorthands first
		const globalShorthandMap = Object.fromEntries(
			globalOptions.map((opt) => [opt.shorthand, opt.name]),
		);
		const mappedGlobalOptions = Object.fromEntries(
			Object.entries(options).map(([key, value]) => [
				globalShorthandMap[key] || key,
				value,
			]),
		);

		// Extract global options
		const {
			provider = "openai",
			model,
			out,
			...restOptions
		} = mappedGlobalOptions;

		// Map operation-specific options
		const mappedOpOptions = mapShorthands(op, restOptions);

		// Get the LLM instance
		const llm = getLLM(provider, model);

		// Execute the operation
		const result = await op.execute(llm, mappedOpOptions);

		// Write to file if out option is provided
		if (out) {
			const output =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			fs.writeFileSync(out, output);
		}

		return result;
	};

// Export the shi object with all operations
export const shi = Object.fromEntries(
	Object.entries(operations).map(([entity, ops]) => [
		entity,
		Object.fromEntries(
			Object.entries(ops).map(([opName, op]) => [
				opName,
				createShiFunction(op),
			]),
		),
	]),
);
