import StyleDictionary from "style-dictionary";

StyleDictionary.registerFormat({
  name: "css/semantic-selectors",
  format: ({ dictionary }) => {
    // Accumulate each group’s block
    const output = Object.keys(dictionary.tokens)
      .map((groupKey) => {
        const selector =
          dictionary.tokens[groupKey].$extensions?.selector || `.${groupKey}`;
        // All tokens in this semantic group
        const tokens = dictionary.allTokens.filter(
          (t) => t.path[0] === groupKey,
        );
        if (!tokens.length) return "";

        // Build each line: LHS uses token.name (last segment), RHS uses full path
        const lines = tokens.map((token) => {
          const local = token.name; // from name/semantic-local
          const value = token.original.$value;
          const isReference = value.startsWith("{");
          const formattedValue = value
            .replaceAll(".", "-")
            .replace(/[{}]/g, "")
            .toLowerCase();
          const comment = token.$description
            ? ` /* ${token.$description} */`
            : "";
          return `  --${local}: ${isReference ? `var(--${formattedValue})` : formattedValue};${comment}`;
        });

        return `${selector} {\n${lines.join("\n")}\n}`;
      })
      .filter(Boolean)
      .join("\n\n");
    return output;
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
      buildPath: "dist/css/",
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
