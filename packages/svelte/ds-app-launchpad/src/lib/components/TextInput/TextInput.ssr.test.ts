import { render } from "@canonical/svelte-ssr-test";
import type { RenderResult } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./TextInput.svelte";

describe("TextInput SSR", () => {
	const baseProps = {} satisfies ComponentProps<typeof Component>;

	it("doesn't throw", () => {
		expect(() => {
			render(Component, { props: { ...baseProps } });
		}).not.toThrow();
	});

	it("renders", () => {
		const page = render(Component, { props: { ...baseProps } });
		expect(componentLocator(page)).toBeInstanceOf(
			page.window.HTMLInputElement,
		);
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
				props: { ...baseProps, class: "test-class" },
			});
			expect(componentLocator(page).classList).toContain("test-class");
			expect(componentLocator(page).classList).toContain("ds");
			expect(componentLocator(page).classList).toContain("text-input");
		});

		it("applies style", () => {
			const page = render(Component, {
				props: { ...baseProps, style: "color: orange;" },
			});
			expect(componentLocator(page).style.color).toBe("orange");
		});
	});

	describe("Input attributes", () => {
		describe("type", () => {
			it("defaults to text", () => {
				const page = render(Component, { props: { ...baseProps } });
				expect(componentLocator(page).getAttribute("type")).toBe("text");
			});

			it.each(["text", "email", "url", "tel"] as const)(
				"accepts %s",
				(type) => {
					const page = render(Component, {
						props: { ...baseProps, type },
					});
					expect(componentLocator(page).getAttribute("type")).toBe(type);
				},
			);
		});

		it("accepts search type", () => {
			const page = render(Component, {
				props: { ...baseProps, type: "search" },
			});
			expect(page.getByRole("searchbox").getAttribute("type")).toBe("search");
		});

		it("applies value", () => {
			const page = render(Component, {
				props: { ...baseProps, value: "test value" },
			});
			expect(componentLocator(page).getAttribute("value")).toBe("test value");
		});

		it("applies validation attributes", () => {
			const page = render(Component, {
				props: {
					...baseProps,
					required: true,
					minlength: 5,
					maxlength: 10,
					pattern: "[A-Za-z]+",
				},
			});
			const input = componentLocator(page);
			expect(input.hasAttribute("required")).toBe(true);
			expect(input.getAttribute("minlength")).toBe("5");
			expect(input.getAttribute("maxlength")).toBe("10");
			expect(input.getAttribute("pattern")).toBe("[A-Za-z]+");
		});
	});
});

function componentLocator(page: RenderResult): HTMLElement {
	return page.getByRole("textbox");
}
