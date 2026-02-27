import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import type { Locator } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import type { RenderResult } from "vitest-browser-svelte";
import Component from "./InputPrimitive.svelte";

describe("InputPrimitive component", () => {
	const baseProps = {} satisfies ComponentProps<typeof Component>;

	it("renders", async () => {
		const page = render(Component, baseProps);
		await expect.element(componentLocator(page)).toBeInTheDocument();
	});

	describe("attributes", () => {
		it.each([
			["id", "test-id"],
			["aria-label", "test-aria-label"],
		])("applies %s", async (attribute, value) => {
			const page = render(Component, { ...baseProps, [attribute]: value });
			await expect
				.element(componentLocator(page))
				.toHaveAttribute(attribute, value);
		});

		it("applies style", async () => {
			const page = render(Component, {
				...baseProps,
				style: "color: orange;",
			});
			await expect
				.element(componentLocator(page))
				.toHaveStyle({ color: "orange" });
		});

		it("applies class", async () => {
			const page = render(Component, { ...baseProps, class: "test-class" });
			const element = componentLocator(page);
			await expect.element(element).toHaveClass("test-class");
		});

		describe("type", () => {
			it("defaults to text", async () => {
				const page = render(Component, { ...baseProps });
				await expect
					.element(componentLocator(page))
					.toHaveAttribute("type", "text");
			});

			it.each(["text", "password", "email", "url", "tel"] as const)(
				"accepts %s",
				async (type) => {
					const page = render(Component, { ...baseProps, type });
					await expect
						.element(componentLocator(page))
						.toHaveAttribute("type", type);
				},
			);
		});

		it("accepts search", async () => {
			const page = render(Component, { ...baseProps, type: "search" });
			await expect
				.element(page.getByRole("searchbox"))
				.toHaveAttribute("type", "search");
		});

		it("applies value", async () => {
			const page = render(Component, {
				...baseProps,
				value: "Test value",
			});
			await expect.element(componentLocator(page)).toHaveValue("Test value");
		});

		describe("disabled", () => {
			it("isn't disabled by default", async () => {
				const page = render(Component, { ...baseProps });
				await expect.element(componentLocator(page)).not.toBeDisabled();
			});

			it("can be disabled", async () => {
				const page = render(Component, { ...baseProps, disabled: true });
				await expect.element(componentLocator(page)).toBeDisabled();
			});
		});

		it("applies validation attributes", async () => {
			const page = render(Component, {
				...baseProps,
				required: true,
			});

			await expect.element(componentLocator(page)).toBeRequired();
			await expect.element(componentLocator(page)).toBeInvalid();

			await componentLocator(page).fill("123");
			await expect.element(componentLocator(page)).toBeValid();
		});
	});
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
	return page.getByRole("textbox");
}
