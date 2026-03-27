import type { Formatters } from "../../shared/formatters.js";
import { renderLookupLlm, renderLookupPlain } from "../../shared/renderers.js";
import type { ModifierFamily } from "../../shared/types/index.js";
import { modifierConfig } from "../modifierConfig.js";

/** Three-mode formatter for `pragma modifier lookup` output. */
const formatters: Formatters<ModifierFamily> = {
  plain: (family) =>
    renderLookupPlain(family, {
      title: (entry) => entry.name,
      fields: [{ label: "IRI", value: (entry) => entry.uri }],
      sections: modifierConfig.lookupSections,
      sectionOverrides: {
        values: {
          plain: (entry) =>
            entry.values.length > 0
              ? entry.values.map((value) => `  ${value}`).join("\n")
              : null,
        },
      },
    }),

  llm: (family) =>
    renderLookupLlm(family, {
      title: (entry) => entry.name,
      fields: [{ label: "IRI", value: (entry) => entry.uri }],
      sections: modifierConfig.lookupSections,
    }),

  json: (family) => JSON.stringify(family, null, 2),
};

export default formatters;
