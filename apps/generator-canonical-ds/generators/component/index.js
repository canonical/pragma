import path from "node:path";
import Generator from "yeoman-generator";
import globalContext from "../app/global-context.js";
import casing from "../utils/casing.js";
export default class ComponentGenerator extends Generator {
    answers;
    initializing() {
        this.log("Welcome to the component generator!");
        this.log("This generator should be run from the root directory of all your application's components (ex: src/components).");
    }
    async prompting() {
        this.answers = await this.prompt([
            {
                type: "input",
                name: "componentAbsolutePath",
                message: "Enter the component's name, including its path (ex: `form/input/Checkbox`):",
                default: ".",
                filter: (input) => {
                    const resolvedInput = path.resolve(this.env.cwd, input);
                    // Force the directory name (the component name) to be PascalCased
                    const dirName = path.basename(resolvedInput);
                    return path.resolve(resolvedInput, "..", casing.toPascalCase(dirName));
                },
            },
            {
                type: "confirm",
                name: "includeStyles",
                message: "Do you want to include styles?",
                default: true,
            },
            {
                type: "confirm",
                name: "includeStorybook",
                message: "Would you like to include a story file?",
                default: true,
            },
        ]);
    }
    /**
     * Gets the path to the component's directory relative to the current working directory.
     * Pascal-cases the final directory name to match React component naming conventions.
     * @param inPath - The path to resolve, relative to the current working directory
     * @return Path to the component's directory relative to the current working directory
     * @example
     * destinationPath("path/to/button/index.ts") // => "/path/to/Button/index.ts"
     */
    destinationPath(...inPath) {
        const rawPath = super.destinationPath(...inPath);
        const dirName = path.dirname(rawPath);
        // Replace the last segment of the path with the Pascal-cased version
        const componentFolder = path.resolve(dirName, "..", casing.toPascalCase(path.basename(dirName)));
        // Append the original file name to the new path
        const fileName = path.basename(rawPath);
        return path.join(componentFolder, fileName);
    }
    writing() {
        if (!this.answers)
            return;
        const componentName = path.basename(this.answers.componentAbsolutePath);
        const templateData = {
            ...globalContext,
            ...this.answers,
            componentName,
            /** The path to the component's directory relative to the current working directory */
            componentRelativePath: path.relative(this.env.cwd, this.answers.componentAbsolutePath),
            componentCssClassName: this.answers.includeStyles && casing.toKebabCase(componentName),
        };
        this.fs.copyTpl(this.templatePath("Component.tsx.ejs"), this.destinationPath(`${this.answers.componentAbsolutePath}/${templateData.componentName}.tsx`), templateData);
        this.fs.copyTpl(this.templatePath("index.ts.ejs"), this.destinationPath(`${this.answers.componentAbsolutePath}/index.ts`), templateData);
        this.fs.copyTpl(this.templatePath("types.ts.ejs"), this.destinationPath(`${this.answers.componentAbsolutePath}/types.ts`), templateData);
        this.fs.copyTpl(this.templatePath("Component.test.tsx.ejs"), this.destinationPath(`${this.answers.componentAbsolutePath}/${templateData.componentName}.test.tsx`), templateData);
        if (this.answers.includeStyles) {
            this.fs.copyTpl(this.templatePath("Component.css.ejs"), this.destinationPath(`${this.answers.componentAbsolutePath}/${templateData.componentName}.css`), templateData);
        }
        if (this.answers.includeStorybook) {
            this.fs.copyTpl(this.templatePath("Component.stories.tsx.ejs"), this.destinationPath(`${this.answers.componentAbsolutePath}/${templateData.componentName}.stories.tsx`), templateData);
        }
    }
}
