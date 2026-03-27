import ejs from "ejs";
import type TemplatingEngine from "./TemplatingEngine.js";

/**
 * Default EJS templating engine implementation.
 */
const ejsEngine: TemplatingEngine = {
  render(template, vars) {
    return ejs.render(template, vars, { async: false });
  },

  async renderAsync(template, vars) {
    return ejs.render(template, vars, { async: true }) as Promise<string>;
  },

  async renderFile(templatePath, vars) {
    return ejs.renderFile(templatePath, vars, { async: true });
  },
};

export default ejsEngine;
