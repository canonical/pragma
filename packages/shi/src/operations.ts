// Assuming LLMInstance is compatible with ChatOpenAI/ChatAnthropic
export interface LLMInstance {
	invoke: (
		messages: { role: string; content: string }[],
	) => Promise<{ content: string }>;
}

export interface Operation {
	name: string;
	description: string;
	options: {
		name: string;
		shorthand: string;
		type: "string" | "file";
		required: boolean;
	}[];
	prompt: string;
	execute: (llm: LLMInstance, options: Record<string, string>) => Promise<any>;
}

export const operations: {
	specification: {
		create: Operation;
	};
	implementation: {
		create: Operation;
		improve: Operation;
		verify: Operation;
	};
} = {
	specification: {
		create: {
			name: "create",
			description: "Create a new specification",
			options: [
				{ name: "name", shorthand: "n", type: "string", required: true },
				{ name: "schema", shorthand: "s", type: "file", required: true },
				{ name: "description", shorthand: "d", type: "string", required: true },
			],
			prompt:
				'Given the RDF Turtle schema: {schema}, the component name: {name}, and the description: {description}, generate a JSON object that conforms to the schema, includes a "name" field set to "{name}", and matches the description. Return only the JSON object without any quotes.',
			execute: async (llm: LLMInstance, options: Record<string, string>) => {
				const { name, schema, description } = options;
				const prompt = operations.specification.create.prompt
					.replace("{schema}", schema)
					.replace("{name}", name)
					.replace("{description}", description);
				const messages = [{ role: "user", content: prompt }];
				const response = await llm.invoke(messages);
				return JSON.parse(response.content);
			},
		},
	},
	implementation: {
		create: {
			name: "create",
			description: "Create a new implementation",
			options: [
				{ name: "specification", shorthand: "s", type: "file", required: true },
				{ name: "platform", shorthand: "p", type: "string", required: true },
			],
			prompt:
				"Generate a {platform} component that conforms to the specification: {specification}. Provide only the code as the output.",
			execute: async (llm: LLMInstance, options: Record<string, string>) => {
				const { specification, platform } = options;
				const prompt = operations.implementation.create.prompt
					.replace("{platform}", platform)
					.replace("{specification}", specification);
				const messages = [{ role: "user", content: prompt }];
				const response = await llm.invoke(messages);
				return response.content;
			},
		},
		improve: {
			name: "improve",
			description: "Improve an existing implementation",
			options: [
				{ name: "specification", shorthand: "s", type: "file", required: true },
				{ name: "platform", shorthand: "p", type: "string", required: true },
				{ name: "improvement", shorthand: "i", type: "string", required: true },
			],
			prompt:
				"Given the specification: {specification}, improve the existing {platform} component by addressing this requirement: {improvement}. Return only the improved code.",
			execute: async (llm: LLMInstance, options: Record<string, string>) => {
				const { specification, platform, improvement } = options;
				const prompt = operations.implementation.improve.prompt
					.replace("{specification}", specification)
					.replace("{platform}", platform)
					.replace("{improvement}", improvement);
				const messages = [{ role: "user", content: prompt }];
				const response = await llm.invoke(messages);
				return response.content;
			},
		},
		verify: {
			name: "verify",
			description: "Verify an implementation against a specification",
			options: [
				{ name: "specification", shorthand: "s", type: "file", required: true },
				{
					name: "implementation",
					shorthand: "i",
					type: "file",
					required: true,
				},
			],
			prompt:
				'Check if the implementation: {implementation} conforms to the specification: {specification}. Return "Yes" or "No" followed by a brief explanation.',
			execute: async (llm: LLMInstance, options: Record<string, string>) => {
				const { specification, implementation } = options;
				const prompt = operations.implementation.verify.prompt
					.replace("{implementation}", implementation)
					.replace("{specification}", specification);
				const messages = [{ role: "user", content: prompt }];
				const response = await llm.invoke(messages);
				return response.content;
			},
		},
	},
};
