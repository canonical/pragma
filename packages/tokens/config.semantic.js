import StyleDictionary from "style-dictionary";

// Register the custom formatter that wraps WRAPPED_FUNC
StyleDictionary.registerFormat({
	name: "css/semantic-selectors",
	format: async ({ dictionary, options, file }) => {
		let output = "";
		let index = 0;
		// Iterate over top-level groups in the token tree
		for (const groupKey in dictionary.tokens) {
			const group = dictionary.tokens[groupKey];
			const selector = group.$extensions?.selector || `.${groupKey}`;
			const tokens = dictionary.allTokens.filter(
				(token) => token.path[0] === groupKey,
			);

			if (tokens.length > 0) {
				// Create a temporary dictionary with only this group's tokens
				const groupDictionary = {
					...dictionary,
					allTokens: tokens,
				};

				const parameters = {
					dictionary: groupDictionary,
					options: {
						...options,
						selector,
						showFileHeader: index === 0 ? options.showFileHeader : false,
					},
					file: {
						...file,
						options: {
							...file.options,
							showFileHeader: index === 0 ? file.showFileHeader : false,
						},
					},
				};

				// Call WRAPPED_FUNC with the group-specific selector
				const groupOutput =
					await StyleDictionary.hooks.formats["css/variables"](parameters);

				// Append the output (remove extra newlines if needed)
				output += `${groupOutput}\n`;
				index++;
			}
		}
		return output.trim();
	},
});

export default {
	source: ["src/primitives/**/*.json", "src/semantic/**/*.json"],
	platforms: {
		css: {
			transforms: ["name/kebab"], // Only transform token names, not values
			buildPath: "dist/",
			files: [
				// {
				// 	destination: "primitives.css",
				// 	format: "css/variables",
				// 	filter: (token) => token.filePath.includes("primitives"), // Only primitive tokens
				// 	options: {
				// 		selector: ":root",
				// 	},
				// },
				{
					destination: "semantic.css",
					format: "css/semantic-selectors",
					filter: (token) => token.filePath.includes("semantic"), // Only semantic tokens
					options: {
						outputReferences: true,
					},
				},
			],
		},
	},
};
