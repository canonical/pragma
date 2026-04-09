import type { Item } from "@canonical/ds-types";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import useNavigationTree from "./useNavigationTree.js";

const testTree: Item = {
  key: "root",
  label: "Root",
  items: [
    { url: "/home", label: "Home" },
    {
      url: "/about",
      label: "About",
      items: [
        { url: "/about/team", label: "Team" },
        { url: "/about/contact", label: "Contact" },
      ],
    },
  ],
};

function NavProbe({ initialUrl }: { initialUrl?: string }) {
  const nav = useNavigationTree({ root: testTree, initialUrl });

  return (
    <nav>
      <ul>
        {nav.annotatedRoot.items?.map((item) => (
          <li key={item.url ?? item.key}>
            <a
              href={item.url}
              data-selected={nav.getNodeStatus(item).selected}
              data-in-branch={nav.getNodeStatus(item).inSelectedBranch}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

describe("useNavigationTree SSR", () => {
  it("renders without errors in node environment", () => {
    const html = renderToString(<NavProbe />);
    expect(html).toContain("Home");
    expect(html).toContain("About");
  });

  it("renders with initialUrl selection", () => {
    const html = renderToString(<NavProbe initialUrl="/home" />);
    expect(html).toContain('data-selected="true"');
  });

  it("marks non-selected items correctly", () => {
    const html = renderToString(<NavProbe initialUrl="/home" />);
    expect(html).toContain('data-selected="false"');
  });
});
