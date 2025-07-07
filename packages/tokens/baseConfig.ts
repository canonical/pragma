import { Config } from "style-dictionary";
import { transformGroups } from "style-dictionary/enums";
import { StyleDictionary } from "style-dictionary-utils";

registerFigmaFormat();

export const baseConfig = {
  include: ["src/primitives/**/*.json"],
  platforms: {
    css: {
      transformGroup: transformGroups.css,
    },
    figma: {
      transformGroup: transformGroups.css,
      transforms: ["color/hex"],
    },
  },
} satisfies Config;

export function registerFigmaFormat() {
  // TODO: Is this needed? Is there a cleaner way to resolve the values?
  // What we want to achieve is to copy the input jsons, but with the primitives replaced with their resolved values.
  StyleDictionary.registerFormat({
    name: "figma",
    format: ({ dictionary }) => {
      const result = {};
      function recurse(currentObject, targetObject) {
        for (const key in currentObject) {
          const value = currentObject[key];

          if (!value.hasOwnProperty("$value")) {
            if (!targetObject[key]) {
              targetObject[key] = {};
            }
            recurse(value, targetObject[key]);
          } else {
            const { $value, $type, $description } = value;
            targetObject[key] = { $value, $type, $description };
          }
        }
      }

      recurse(dictionary.tokens, result);
      return JSON.stringify(result, null, 2);
    },
  });
}
