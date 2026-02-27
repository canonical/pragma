import { render } from "@canonical/svelte-ssr-test";
import type { RenderResult } from "@canonical/svelte-ssr-test";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Component from "./NumberInput.svelte";

describe("NumberInput SSR", () => {
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
			expect(componentLocator(page).classList).toContain("number-input");
		});

		it("applies style", () => {
			const page = render(Component, {
				props: { ...baseProps, style: "color: orange;" },
			});
			expect(componentLocator(page).style.color).toBe("orange");
		});
	});

	describe("Input attributes", () => {
		it("sets type to number", () => {
			const page = render(Component, { props: { ...baseProps } });
			expect(componentLocator(page).getAttribute("type")).toBe("number");
		});

		it("applies value", () => {
			const page = render(Component, {
				props: { ...baseProps, value: 123 },
			});
			expect(componentLocator(page).getAttribute("value")).toBe("123");
		});

		it("applies disabled", () => {
			const page = render(Component, {
				props: { ...baseProps, disabled: true },
			});
			expect(componentLocator(page).hasAttribute("disabled")).toBe(true);
		});
	});

	describe("Validation attributes", () => {
		it("applies required", () => {
			const page = render(Component, {
				props: {
					...baseProps,
					required: true,
				},
			});
			expect(componentLocator(page).hasAttribute("required")).toBe(true);
		});

		it("applies min and max", () => {
			const page = render(Component, {
				props: {
					...baseProps,
					min: 5,
					max: 10,
				},
			});
			const input = componentLocator(page);
			expect(input.getAttribute("min")).toBe("5");
			expect(input.getAttribute("max")).toBe("10");
		});
	});
});

function componentLocator(page: RenderResult): HTMLElement {
	return page.getByRole("spinbutton");
}
