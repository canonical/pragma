import { describe, expect, it } from "vitest";
import renderString from "../../template/renderString.js";
import withHelpers from "../../template/withHelpers.js";

describe("template rendering integration", () => {
  it("can use helpers in templates", () => {
    const vars = withHelpers({
      componentName: "my-button",
      properties: ["label", "onClick", "disabled"],
    });

    const tpl = `
export const <%= pascalCase(componentName) %> = () => {
  // Props: <%= join(properties) %>
};
`;

    const result = renderString(tpl, vars);

    expect(result).toContain("export const MyButton = () => {");
    expect(result).toContain("// Props: label, onClick, disabled");
  });

  it("can generate TypeScript interfaces", () => {
    const vars = withHelpers({
      interfaceName: "button-props",
      properties: [
        { name: "label", type: "string" },
        { name: "onClick", type: "() => void" },
        { name: "disabled", type: "boolean" },
      ],
    });

    const tpl = `
interface <%= pascalCase(interfaceName) %> {
<% properties.forEach(prop => { %>
  <%= prop.name %>: <%- prop.type %>;
<% }) %>
}
`;

    const result = renderString(tpl, vars);

    expect(result).toContain("interface ButtonProps {");
    expect(result).toContain("label: string;");
    expect(result).toContain("onClick: () => void;");
    expect(result).toContain("disabled: boolean;");
  });

  it("can generate import statements", () => {
    const vars = withHelpers({
      imports: [
        { from: "react", names: ["useState", "useEffect"] },
        { from: "./types", names: ["Props"] },
      ],
    });

    const tpl = `
<% imports.forEach(imp => { %>
import { <%= join(imp.names) %> } from '<%= imp.from %>';
<% }) %>
`;

    const result = renderString(tpl, vars);

    expect(result).toContain("import { useState, useEffect } from 'react';");
    expect(result).toContain("import { Props } from './types';");
  });
});
