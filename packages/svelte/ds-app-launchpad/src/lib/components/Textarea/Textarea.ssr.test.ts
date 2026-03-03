import { render } from "@canonical/svelte-ssr-test";
import type { RenderResult } from "@canonical/svelte-ssr-test";
import { describe, expect, it } from "vitest";
import Component from "./Textarea.svelte";
import type { TextareaProps } from "./types.js";

describe("Textarea SSR", () => {
	const baseProps = {
		value: "Textarea",
	} satisfies TextareaProps;

	it("doesn't throw", () => {
		expect(() => {
			render(Component, { props: { ...baseProps } });
		}).not.toThrow();
	});

	it("renders", () => {
		const page = render(Component, {
			props: { ...baseProps },
		});
		expect(componentLocator(page)).toBeInstanceOf(
			page.window.HTMLTextAreaElement,
		);
		const textarea = componentLocator(page) as HTMLTextAreaElement;
		expect(textarea.value).toBe("Textarea");
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
			expect(componentLocator(page).classList).toContain("textarea");
		});

		it("applies style", () => {
			const page = render(Component, {
				props: { ...baseProps, style: "color: orange;" },
			});
			expect(componentLocator(page).style.color).toBe("orange");
		});
	});
});

function componentLocator(page: RenderResult): HTMLElement {
	return page.getByRole("textbox");
}
