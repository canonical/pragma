import * as fs from "node:fs";
import type Generator from "yeoman-generator";

/**
 * Creates a file at the specified path if it does not exist.
 * @param destinationPath - The path to the file to create.
 */
export const touchFile = (destinationPath: string): void => {
  if (fs.existsSync(destinationPath)) {
    console.log(`File already exists: ${destinationPath}`);
    return;
  }

  fs.writeFileSync(destinationPath, "");
};

/**
 * Creates a file if it does not exist, or appends content to it if it does.
 * @param destinationPath - The path to the file to touch or append.
 * @param contentToAppend - The content to append to the file if it exists.
 */
export const touchOrAppendFile = (
  destinationPath: string,
  contentToAppend: string | Buffer<ArrayBufferLike>,
): void => {
  if (!fs.existsSync(destinationPath)) {
    touchFile(destinationPath);
  }
  fs.appendFileSync(destinationPath, contentToAppend);
  console.log(`Appended content to file: ${destinationPath}`);
};

/**
 * Appends content to a parent index file, creating it if it does not exist.
 * @param generator - The Yeoman generator instance.
 * @param templateData - Data to be used in the template.
 * @param parentTemplatePath - The path to the parent index template file.
 * @param parentIndexPath - The path to the parent index file where content will be appended.
 * @todo this can be removed once https://github.com/yeoman/generator/issues/1651 is closed
 */
export const appendToParentIndexFile = (
  generator: Generator,
  templateData = {},
  parentTemplatePath = "parent-index.ts.ejs",
  parentIndexPath = "index.ts",
) => {
  const parentTemplatePathResolved = generator.templatePath(parentTemplatePath);
  const parentTemplateContents =
    generator.fs.read(parentTemplatePathResolved) || "";
  const toAppend = generator.fs._processTpl({
    contents: parentTemplateContents,
    context: templateData,
    filename: parentTemplatePathResolved,
  });

  touchOrAppendFile(generator.destinationPath(parentIndexPath), toAppend);
};
