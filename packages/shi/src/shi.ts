import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { type Operation, operations } from "./operations";

const getLLM = (provider: string, model: string) => {
	switch (provider) {
		case "openai":
			return new ChatOpenAI({
				apiKey: process.env.OPENAI_API_KEY,
				modelName: model,
			});
		case "anthropic":
			return new ChatAnthropic({
				apiKey: process.env.ANTHROPIC_API_KEY,
				modelName: model,
			});
		default:
			throw new Error(`Unsupported LLM provider: ${provider}`);
	}
};

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

export const shi = Object.fromEntries(
	Object.entries(operations).map(([entity, ops]) => [
		entity,
		Object.fromEntries(
			Object.entries(ops).map(([opName, op]) => [
				opName,
				async (options: Record<string, string>) => {
					const {
						provider = "openai",
						model = "gpt-4.1-mini",
						...opOptions
					} = mapShorthands(op, options);
					const llm = getLLM(provider, model);
					return op.execute(llm, opOptions);
				},
			]),
		),
	]),
);
