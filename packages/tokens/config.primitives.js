import StyleDictionary from "style-dictionary";

export default {
  source: ["src/primitives/**/*.json"],
  platforms: {
    cssPrimitives: {
      buildPath: "dist/css/",
      transformGroup: "css",
      files: [
        {
          destination: "primitives-canonical.css",
          format: "css/variables", // built-in format that outputs tokens under :root
        },
      ],
    },
  },
};
