import type { NavLink } from "@canonical/lit-ds-prototype";
import { html, type TemplateResult } from "lit";

const serverLinks: NavLink[] = [
  { label: "Hyperscale", href: "/server/hyperscale" },
  { label: "Docs", href: "#" },
];

const serverNavigation = (): TemplateResult => html`
    <ds-navigation
        brand="Ubuntu Server"
        .links=${serverLinks}
    ></ds-navigation>
`;

export const pageLayout = (content: TemplateResult): TemplateResult => html`
    ${serverNavigation()}
    <ds-site-layout>
        ${content}
    </ds-site-layout>
`;
