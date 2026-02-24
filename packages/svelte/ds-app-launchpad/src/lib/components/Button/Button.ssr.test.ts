import { render } from "@canonical/svelte-ssr-test";
import type { RenderResult } from "@canonical/svelte-ssr-test";
import { createRawSnippet } from "svelte";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./Button.svelte";

describe("Button SSR", () => {
	const baseProps = {
		children: createRawSnippet(() => ({
			render: () => `<span>Button</span>`,
		})),
		"data-testid": "button",
	} satisfies ComponentProps<typeof Component>;

	describe("basics", () => {
		it("doesn't throw", () => {
			expect(() => {
				render(Component, { props: { ...baseProps } });
			}).not.toThrow();
		});

		it("renders as a button by default", () => {
			const page = render(Component, { props: { ...baseProps } });
			expect(componentLocator(page)).toBeInstanceOf(
				page.window.HTMLButtonElement,
			);
		});

		it("renders as an anchor when href is provided", () => {
			const page = render(Component, {
				props: { ...baseProps, href: "https://example.com" },
			});
			const link = page.getByRole("link");
			expect(link).toBeInstanceOf(page.window.HTMLAnchorElement);
		});
	});

	describe("attributes", () => {
		it.each([
			["id", "test-id"],
			["aria-label", "test-aria-label"],
		])("applies %s", (attribute, expected) => {
			const page = render(Component, {
				props: { ...baseProps, [attribute]: expected },
			});
			expect(componentLocator(page).getAttribute(attribute)).toBe(expected);
		});

		it("applies classes", () => {
			const page = render(Component, {
				props: { class: "test-class", ...baseProps },
			});
			expect(componentLocator(page).classList).toContain("test-class");
			expect(componentLocator(page).classList).toContain("ds");
			expect(componentLocator(page).classList).toContain("button");
		});

		it("applies style", () => {
			const page = render(Component, {
				props: { style: "color: orange;", ...baseProps },
			});
			expect(componentLocator(page).style.color).toBe("orange");
		});
	});

	describe("modifiers", () => {
		it("applies severity class", () => {
			const page = render(Component, {
				props: { ...baseProps, severity: "brand" },
			});
			expect(componentLocator(page).classList).toContain("brand");
		});

		it("applies density class", () => {
			const page = render(Component, {
				props: { ...baseProps, density: "dense" },
			});
			expect(componentLocator(page).classList).toContain("dense");
		});
	});

	describe("disabled state", () => {
		it("disables the button when disabled", () => {
			const page = render(Component, {
				props: { ...baseProps, disabled: true },
			});
			expect(componentLocator(page).hasAttribute("disabled")).toBe(true);
			expect(componentLocator(page).classList).toContain(
				"explicit-disabled",
			);
		});

		it("disables the button when loading", () => {
			const page = render(Component, {
				props: { ...baseProps, loading: true },
			});
			expect(componentLocator(page).hasAttribute("disabled")).toBe(true);
			expect(componentLocator(page).classList).toContain("loading");
		});
	});
});

function componentLocator(page: RenderResult): HTMLElement {
	return page.getByTestId("button");
}
