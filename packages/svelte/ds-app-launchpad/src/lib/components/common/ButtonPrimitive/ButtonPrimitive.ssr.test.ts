import { render } from "@canonical/svelte-ssr-test";
import type { RenderResult } from "@canonical/svelte-ssr-test";
import { createRawSnippet } from "svelte";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./ButtonPrimitive.svelte";

describe("ButtonPrimitive SSR", () => {
	const baseProps = {
		children: createRawSnippet(() => ({
			render: () => `<span>Click me</span>`,
		})),
		"data-testid": "button-primitive",
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
			expect(link.getAttribute("href")).toBe("https://example.com");
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
		});
	});

	describe("disabled state", () => {
		it("disables the button", () => {
			const page = render(Component, {
				props: { ...baseProps, disabled: true },
			});
			expect(componentLocator(page).hasAttribute("disabled")).toBe(true);
		});

		it("disables the anchor with aria-disabled", () => {
			const page = render(Component, {
				props: {
					...baseProps,
					href: "https://example.com",
					disabled: true,
				},
			});
			const anchor = page.getByRole("link");
			expect(anchor.getAttribute("aria-disabled")).toBe("true");
			expect(anchor.hasAttribute("href")).toBe(false);
		});
	});
});

function componentLocator(page: RenderResult): HTMLElement {
	return page.getByTestId("button-primitive");
}
