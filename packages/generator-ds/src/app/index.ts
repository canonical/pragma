import Generator from "yeoman-generator";
import globalContext from "./global-context.js";

export default class BaseGenerator extends Generator {
  private subgenerators = [
    {
      name: "component",
      description: "Create a new React component",
    },
  ];

  /**
   * The root generator serves as a menuing system for the subgenerators.
   * Its only purpose is to list subgenerators and prompt the user to select one.
   * If the user runs the generator without any arguments, it will display the list of subgenerators.
   */
  showRootWelcomeMessage() {
    // When --help is used, `this.log` is not defined and `help()` is invoked by the Yeoman lib anyway.
    if (this.options.help) return;

    this.log(this.help());
  }

  help() {
    const subgeneratorHelp = `
    Please call a subgenerator from the following list:
    ${this.subgenerators
      .map(
        (subgen) =>
          `\t- yo ${globalContext.generatorScriptIdentifer}:${subgen.name} - ${subgen.description}`,
      )
      .join("\n")}
    \nTo see usage details for a generator, use the \`--help\` flag.\n\tFor example: yo ${globalContext.generatorScriptIdentifer}:${this.subgenerators[0].name} --help  
    `;

    return `${super.help()}\n${subgeneratorHelp}`;
  }
}
