import { readdirSync } from "fs";
import { basename } from "path";
import StyleDictionary from "style-dictionary";

// Register a parser that attaches the file name as an attribute for modes.
// Renamed the parser to avoid conflicts with the global one.
StyleDictionary.registerParser({
	name: "modes-parser",
	pattern: /src[\\\/]modes[\\\/].*\.json$/i,
	parser: ({ contents, filePath }) => {
		const data = JSON.parse(contents);
		const tokens = [];
		// Extract the file basename (e.g. "canonical" from "canonical.json")
		const fileName = basename(filePath, ".json");
		Object.entries(data).forEach(([modeKey, modeData]) => {
			const selector = modeData.$extensions?.selector;
			if (!selector) return;
			Object.entries(modeData).forEach(([tokenKey, tokenValue]) => {
				if (tokenKey === "$extensions") return;
				tokens.push({
					// Prefix token names with the mode key to avoid collisions.
					name: `${modeKey}-${tokenKey}`,
					value: tokenValue.$value,
					type: tokenValue.$type,
					// Attach both the selector and the originating file name.
					attributes: { selector, file: fileName },
					comment: tokenValue.$description,
				});
			});
		});
		return tokens;
	},
});

// Custom format that groups tokens by their CSS selector.
StyleDictionary.registerFormat({
	name: "css/mode-variables",
	format: ({ dictionary }) => {
		const groups = {};
		dictionary.allTokens.forEach((token) => {
			const selector = token.attributes.selector;
			if (!selector) return;
			groups[selector] = groups[selector] || [];
			groups[selector].push(`  --${token.name}: ${token.value};`);
		});
		return Object.entries(groups)
			.map(([selector, vars]) => `${selector} {\n${vars.join("\n")}\n}`)
			.join("\n\n");
	},
});

// Dynamically create file entries – one per input mode file.
const modesDir = "src/modes";
const modeFiles = readdirSync(modesDir).filter((file) =>
	file.endsWith(".json"),
);
const fileEntries = modeFiles.map((file) => {
	const name = basename(file, ".json");
	return {
		// Output file, e.g. "canonical.css" for canonical.json.
		destination: `${name}.css`,
		format: "css/mode-variables",
		transforms: [], // Disable default transforms.
		// Filter tokens to include only those from this file.
		filter: (token) => token.attributes.file === name,
	};
});

export default {
	// Use only mode JSON files.
	source: ["src/modes/*.json"],
	parsers: ["modes-parser"],
	platforms: {
		cssModes: {
			buildPath: "dist/modes/",
			files: fileEntries,
		},
	},
};
