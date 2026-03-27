import type { Formatters } from "../../shared/formatters.js";
import { renderListLlm } from "../../shared/renderers.js";
import type { ModifierFamily } from "../../shared/types/index.js";
import { modifierConfig } from "../modifierConfig.js";

/** Three-mode formatter for `pragma modifier list` output. */
const formatters: Formatters<ModifierFamily[]> = {
  plain: (families) =>
    families
      .map((family) => `${family.name}: ${family.values.join(", ")}`)
      .join("\n"),

  llm: (families) =>
    renderListLlm(families, {
      heading: "Modifier Families",
      columns: modifierConfig.listColumns,
    }),

  json: (families) => JSON.stringify(families, null, 2),
};

export default formatters;
