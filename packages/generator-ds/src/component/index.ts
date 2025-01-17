import path from "node:path";
import { casing } from "@canonical/utils";
import Generator, { type BaseOptions } from "yeoman-generator";
import globalContext from "../app/global-context.js";

interface ComponentGeneratorAnswers {
	/** The path to the component's root directory */
	componentPath: string;
	/** Whether to include styles in the component */
	withStyles: boolean;
	/** Whether to include a storybook story in the component */
	withStories: boolean;
}

type ComponentGeneratorOptions = BaseOptions & ComponentGeneratorAnswers;

export default class ComponentGenerator extends Generator<ComponentGeneratorOptions> {
	answers!: ComponentGeneratorAnswers;

	constructor(args: string | string[], options: ComponentGeneratorOptions) {
		super(args, options);

		// Output introductory logging if help is not requested
		// If help is requested, the `log()` function is not defined, so this block is skipped
		if (!this.options.help) {
			this.log("Welcome to the component generator!");
			this.log(
				"This generator should be run from the root directory of all your application's components (ex: src/components).",
			);
			this.log(
				`This generator supports CLI input only. Use yo ${globalContext.generatorScriptIdentifer}:component --help for more information.`,
			);
		}

		this.argument("componentPath", {
			type: String,
			description: "The path to the component's root directory",
			required: true,
			default: this.env.cwd,
		});

		this.option("withStyles", {
			type: Boolean,
			description: "Include styles in the component",
			default: false,
		});

		this.option("withStories", {
			type: Boolean,
			description: "Include a storybook story in the component",
			default: false,
		});

		this.answers = {
			componentPath: path.resolve(this.env.cwd, this.options.componentPath),
			withStyles: this.options.withStyles,
			withStories: this.options.withStories,
		};
	}

	/**
	 * Gets the path to the component's directory relative to the current working directory.
	 * Pascal-cases the final directory name to match React component naming conventions.
	 * @param inPath - The path to resolve, relative to the current working directory
	 * @return Path to the component's directory relative to the current working directory
	 * @example
	 * destinationPath("path/to/button/index.ts") // => "/path/to/Button/index.ts"
	 */
	destinationPath(...inPath: string[]): string {
		const rawPath = super.destinationPath(...inPath);
		const dirName = path.dirname(rawPath);

		// Replace the last segment of the path with the Pascal-cased version
		const componentFolder = path.resolve(
			dirName,
			"..",
			casing.toPascalCase(path.basename(dirName)),
		);

		// Append the original file name to the new path
		const fileName = path.basename(rawPath);

		return path.join(componentFolder, fileName);
	}

	writing(): void {
		if (!this.answers) return;

		const componentName = casing.toPascalCase(
			path.basename(this.answers.componentPath),
		);

		const templateData = {
			...globalContext,
			...this.answers,
			componentName,
			/** The path to the component's directory relative to the current working directory */
			componentRelativePath: path.relative(
				this.env.cwd,
				this.answers.componentPath,
			),
			componentCssClassName:
				this.answers.withStyles && casing.toKebabCase(componentName),
		};

		this.fs.copyTpl(
			this.templatePath("Component.tsx.ejs"),
			this.destinationPath(
				`${this.answers.componentPath}/${templateData.componentName}.tsx`,
			),
			templateData,
		);

		this.fs.copyTpl(
			this.templatePath("index.ts.ejs"),
			this.destinationPath(`${this.answers.componentPath}/index.ts`),
			templateData,
		);

		this.fs.copyTpl(
			this.templatePath("types.ts.ejs"),
			this.destinationPath(`${this.answers.componentPath}/types.ts`),
			templateData,
		);

		this.fs.copyTpl(
			this.templatePath("Component.test.tsx.ejs"),
			this.destinationPath(
				`${this.answers.componentPath}/${templateData.componentName}.test.tsx`,
			),
			templateData,
		);

		if (this.answers.withStyles) {
			this.fs.copyTpl(
				this.templatePath("Component.css.ejs"),
				this.destinationPath(
					`${this.answers.componentPath}/${templateData.componentName}.css`,
				),
				templateData,
			);
		}

		if (this.answers.withStories) {
			this.fs.copyTpl(
				this.templatePath("Component.stories.tsx.ejs"),
				this.destinationPath(
					`${this.answers.componentPath}/${templateData.componentName}.stories.tsx`,
				),
				templateData,
			);
		}
	}
}
