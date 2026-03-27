import type { Formatters } from "../../shared/formatters.js";
import { renderLookupLlm, renderLookupPlain } from "../../shared/renderers.js";
import { standardConfig } from "../standardConfig.js";
import type { StandardLookupInput } from "./types.js";

/** Three-mode formatter for `pragma standard lookup` output. */
const formatters: Formatters<StandardLookupInput> = {
  plain: ({ standard, detailed }) =>
    renderLookupPlain(standard, {
      title: (entry) => entry.name,
      fields: [
        { label: "URI", value: (entry) => entry.uri },
        { label: "Category", value: (entry) => entry.category || "—" },
        { label: "Description", value: (entry) => entry.description },
        { label: "Extends", value: (entry) => entry.extends },
      ],
      sections: detailed
        ? standardConfig.lookupSections.filter(
            (section) => section.key === "dos" || section.key === "donts",
          )
        : [],
      sectionOverrides: standardSectionOverrides,
    }),

  llm: ({ standard, detailed }) =>
    renderLookupLlm(standard, {
      title: (entry) => entry.name,
      fields: [
        { label: "URI", value: (entry) => entry.uri },
        { label: "Category", value: (entry) => entry.category || "—" },
        { label: "Description", value: (entry) => entry.description },
        { label: "Extends", value: (entry) => entry.extends },
      ],
      sections: detailed
        ? standardConfig.lookupSections.filter(
            (section) => section.key === "dos" || section.key === "donts",
          )
        : [],
      sectionOverrides: standardSectionOverrides,
    }),

  json({ standard, detailed }) {
    if (detailed) {
      return JSON.stringify(standard, null, 2);
    }
    const { dos: _dos, donts: _donts, ...summary } = standard;
    return JSON.stringify(summary, null, 2);
  },
};

export default formatters;

const standardSectionOverrides = {
  dos: {
    plain: (entry: StandardLookupInput["standard"]) =>
      entry.dos.length > 0
        ? entry.dos.map((item) => `  ${item.code}`).join("\n")
        : null,
    llm: (entry: StandardLookupInput["standard"]) =>
      entry.dos.length > 0
        ? entry.dos.map((item) => `- ${item.code}`).join("\n")
        : null,
  },
  donts: {
    plain: (entry: StandardLookupInput["standard"]) =>
      entry.donts.length > 0
        ? entry.donts.map((item) => `  ${item.code}`).join("\n")
        : null,
    llm: (entry: StandardLookupInput["standard"]) =>
      entry.donts.length > 0
        ? entry.donts.map((item) => `- ${item.code}`).join("\n")
        : null,
  },
};
