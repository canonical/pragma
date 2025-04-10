import StyleDictionary from "style-dictionary";

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
				// We prefer reusing the existing format function to avoid code duplication and API divergence
				// https://github.com/amzn/style-dictionary/blob/main/lib/common/formats.js
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

StyleDictionary.registerTransform({
	name: "name/semantic-local",
	type: "name",
	transform: (token) => {
		// Use only the last part of the token's path as the variable name
		return token.path[token.path.length - 1].replace(/ /g, "-").toLowerCase();
	},
});

export default {
	source: ["src/primitives/**/*.json", "src/semantic/**/*.json"],
	platforms: {
		css: {
			transforms: ["name/semantic-local"], // Only transform token names, not values
			buildPath: "dist/",
			files: [
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
