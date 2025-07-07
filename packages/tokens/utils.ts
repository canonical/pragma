import { TransformedToken } from "style-dictionary";
import { StyleDictionary } from "style-dictionary-utils";

import { readdir, rm } from "node:fs/promises";
import { formats } from "style-dictionary/enums";
import { Mode } from "./types";
import { baseConfig } from "./baseConfig";

export function isSemantic(token: TransformedToken) {
  return token.filePath.includes("semantic");
}

export async function readModes(category: string): Promise<Mode[]> {
  const basePath = `src/semantic/${category}`;

  return (
    await readdir(basePath, {
      recursive: true,
    })
  )
    .filter((path) => path.endsWith(".json"))
    .map((path) => ({
      path: `${basePath}/${path}`,
      modeName: path.replace(/\.json$/, "").replace("/", "-"),
    }));
}

export async function buildSimpleModes(category: string, modes: Mode[]) {
  const dictionaries = await Promise.all(
    modes.map(({ path, modeName }) =>
      new StyleDictionary(baseConfig, { verbosity: "verbose" }).extend({
        source: [path],
        platforms: {
          css: {
            buildPath: `dist/css/${category}/`,
            files: [
              {
                destination: `${modeName}.css`,
                format: formats.cssVariables,
                filter: (token) => isSemantic(token),
              },
            ],
          },
          figma: {
            buildPath: `dist/figma/${category}/`,
            files: [
              {
                destination: `${modeName}.json`,
                format: "figma",
                filter: (token) => isSemantic(token),
              },
            ],
          },
        },
      }),
    ),
  );

  await Promise.all(
    dictionaries.map((dictionary) => dictionary.buildAllPlatforms()),
  );

  await writeFigmaManifest(category, modes);
}

export async function mergeDirectory(directory: string) {
  const files = (
    await readdir(directory, {
      withFileTypes: true,
      recursive: false,
    })
  ).filter((file) => file.isFile());

  if (files.length === 0) {
    console.warn(`No files found in directory: ${directory}`);
    return;
  }

  const extension = files[0].name.split(".").pop();
  if (files.some((file) => file.name.split(".").pop() !== extension)) {
    console.error(`Files in directory ${directory} have different extensions.`);
    return;
  }

  if (directory.endsWith("/")) {
    directory = directory.slice(0, -1);
  }

  const contents = (
    await Promise.all(
      files.map((file) => Bun.file(`${file.parentPath}/${file.name}`).text()),
    )
  ).join("\n\n");

  const outputPath = `${directory}.${extension}`;
  const outputFile = Bun.file(outputPath);

  await Bun.write(outputFile, contents);

  console.log(`Merged files into: ${outputPath}`);

  await rm(directory, { recursive: true });
}

async function writeFigmaManifest(collection: string, modes: Mode[]) {
  await Bun.write(
    `dist/figma/${collection}/manifest.json`,
    JSON.stringify(
      {
        name: `Pragma ${collection} tokens`,
        collections: {
          [collection]: {
            modes: modes.reduce((acc, { modeName }) => {
              acc[modeName] = [`${modeName}.json`];
              return acc;
            }, {}),
          },
        },
      },
      null,
      2,
    ),
  );
}
