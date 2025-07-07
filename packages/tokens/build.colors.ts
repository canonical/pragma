import { StyleDictionary } from "style-dictionary-utils";
import {
  buildSimpleModes,
  isSemantic,
  mergeDirectory,
  readModes,
} from "./utils";
import { baseConfig } from "./baseConfig";

const category = "colors";
const modes = await readModes(category);

await buildSimpleModes(category, modes);

{
  // Ubuntu system preference
  const outModeName = "ubuntu-system";
  const modesToCompose = [
    {
      path: `src/semantic/${category}/ubuntu/light.json`,
      mode: "light",
    },
    {
      path: `src/semantic/${category}/ubuntu/dark.json`,
      mode: "dark",
    },
  ];

  const buildPath = `dist/css/${category}/${outModeName}/`;

  const systemPreferenceDictionary = await Promise.all(
    modesToCompose.map(({ path, mode }) =>
      new StyleDictionary(baseConfig, { verbosity: "verbose" }).extend({
        source: [path],
        platforms: {
          css: {
            buildPath,
            files: [
              {
                destination: `${mode}.css`,
                format: "css/advanced",
                filter: (token) => isSemantic(token),
                options: {
                  rules: [
                    {
                      atRule: `@media (prefers-color-scheme: ${mode})`,
                      matcher: () => true,
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    ),
  );

  await Promise.all(
    systemPreferenceDictionary.map((dictionary) =>
      dictionary.buildPlatform("css"),
    ),
  );

  await mergeDirectory(buildPath);
}

{
  // Canonical classed
  const outModeName = "canonical-classed";
  const modesToCompose = [
    {
      path: `src/semantic/${category}/canonical/light.json`,
      mode: "light",
    },
    {
      path: `src/semantic/${category}/canonical/dark.json`,
      mode: "dark",
    },
  ];

  const buildPath = `dist/css/${category}/${outModeName}/`;

  const classedDictionary = await Promise.all(
    modesToCompose.map(({ path, mode }) =>
      new StyleDictionary(baseConfig, { verbosity: "verbose" }).extend({
        source: [path],
        platforms: {
          css: {
            buildPath,
            files: [
              {
                destination: `${mode}.css`,
                format: "css/advanced",
                filter: (token) => isSemantic(token),
                options: {
                  selector: `.${mode}`,
                },
              },
            ],
          },
        },
      }),
    ),
  );

  await Promise.all(
    classedDictionary.map((dictionary) => dictionary.buildPlatform("css")),
  );

  await mergeDirectory(buildPath);
}
