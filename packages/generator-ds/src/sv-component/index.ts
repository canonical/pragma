import path from "node:path";
import { casing, invariant } from "@canonical/utils";
import Generator, { type BaseOptions } from "yeoman-generator";
import globalContext from "../app/global-context.js";
import { appendToParentIndexFile, touchOrAppendFile } from "../util/files.js";

interface ComponentGeneratorAnswers {
  /** The path to the component's root directory */
  componentPath: string;
  /** Whether to include styles in the component */
  withStyles: boolean;
  /** Whether to include stories for the component */
  withStories: boolean;
  /** Whether to use `.ts` based story formats instead of the CSF3 & `.svelte` format */
  useTsStories: boolean;
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
        `Use yo ${globalContext.generatorScriptIdentifer}:sv-component --help for more information.`,
      );
    }

    this.argument("componentPath", {
      type: String,
      description:
        "The path to the component's root directory. The last segment of the path will be used as the component name. For instance, 'path/to/Button' will create a 'Button' component in 'path/to'. Please note that you will want the last segment of your path to use PascalCase, following Svelte conventions.",
      required: true,
      default: this.env.cwd,
    });

    this.option("withStyles", {
      type: Boolean,
      description: "Creates a `styles.css` file associated with the component.",
      default: false,
      alias: "c",
    });

    this.option("withStories", {
      type: Boolean,
      description:
        "Creates a `[ComponentName].stories.svelte` file associated with the component.",
      default: false,
      alias: "s",
    });

    this.option("useTsStories", {
      type: Boolean,
      description:
        "Uses the `.ts` based story formats instead of the CSF3 & `.svelte` format. Useful when there is a specific need for a template-based stories or function-based stories, otherwise not recommended. Has no effect if `withStories` is not set.",
      default: false,
      alias: "t",
    });

    this.answers = {
      componentPath: path.resolve(this.env.cwd, this.options.componentPath),
      withStyles: this.options.withStyles,
      withStories: this.options.withStories,
      useTsStories: this.options.useTsStories,
    };
  }

  writing(): void {
    if (!this.answers) return;

    const componentName = path.basename(this.answers.componentPath);

    invariant(
      casing.isPascalCase(componentName),
      `The component name ${componentName} must be in PascalCase.`,
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
      this.templatePath("Component.svelte.ejs"),
      this.destinationPath(
        `${this.answers.componentPath}/${templateData.componentName}.svelte`,
      ),
      templateData,
    );

    appendToParentIndexFile(this, templateData);

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
      this.templatePath("Component.ssr.test.ejs"),
      this.destinationPath(
        `${this.answers.componentPath}/${templateData.componentName}.ssr.test.ts`,
      ),
      templateData,
    );

    this.fs.copyTpl(
      this.templatePath("Component.svelte.test.ejs"),
      this.destinationPath(
        `${this.answers.componentPath}/${templateData.componentName}.svelte.test.ts`,
      ),
      templateData,
    );

    if (this.answers.withStyles) {
      this.fs.copyTpl(
        this.templatePath("styles.css.ejs"),
        this.destinationPath(`${this.answers.componentPath}/styles.css`),
        templateData,
      );
    }

    if (this.answers.withStories) {
      if (this.answers.useTsStories) {
        this.fs.copyTpl(
          this.templatePath("Component.stories.ts.ejs"),
          this.destinationPath(
            `${this.answers.componentPath}/${templateData.componentName}.stories.ts`,
          ),
          templateData,
        );
      } else {
        this.fs.copyTpl(
          this.templatePath("Component.stories.svelte.ejs"),
          this.destinationPath(
            `${this.answers.componentPath}/${templateData.componentName}.stories.svelte`,
          ),
          templateData,
        );
      }
    }
  }
}
