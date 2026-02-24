import type { Locator } from "@vitest/browser/context";
import { createRawSnippet } from "svelte";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import type { RenderResult } from "vitest-browser-svelte";
import Component from "./ButtonPrimitive.svelte";

describe("ButtonPrimitive component", () => {
	const baseProps = {
		children: createRawSnippet(() => ({
			render: () => `<span>Click me</span>`,
		})),
		"data-testid": "button-primitive",
	} satisfies ComponentProps<typeof Component>;

	it("renders as a button by default", async () => {
		const page = render(Component, { ...baseProps });
		await expect.element(page.getByRole("button")).toBeInTheDocument();
		await expect.element(page.getByText("Click me")).toBeVisible();
	});

	it("renders as an anchor when href is provided", async () => {
		const page = render(Component, {
			...baseProps,
			href: "https://example.com",
		});
		await expect.element(page.getByRole("link")).toBeInTheDocument();
		await expect
			.element(page.getByRole("link"))
			.toHaveAttribute("href", "https://example.com");
	});

	describe("attributes", () => {
		it.each([
			["id", "test-id"],
			["aria-label", "test-aria-label"],
		])("applies %s", async (attribute, expected) => {
			const page = render(Component, {
				...baseProps,
				[attribute]: expected,
			});
			await expect
				.element(componentLocator(page))
				.toHaveAttribute(attribute, expected);
		});

		it("applies classes", async () => {
			const page = render(Component, {
				...baseProps,
				class: "test-class",
			});
			await expect
				.element(componentLocator(page))
				.toHaveClass("test-class");
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
	});

	describe("disabled state", () => {
		it("disables the button", async () => {
			const page = render(Component, { ...baseProps, disabled: true });
			await expect.element(page.getByRole("button")).toBeDisabled();
		});

		it("disables the anchor by removing href and setting aria-disabled", async () => {
			const page = render(Component, {
				...baseProps,
				href: "https://example.com",
				disabled: true,
			});
			const link = page.getByRole("link");
			await expect.element(link).toHaveAttribute("aria-disabled", "true");
		});
	});
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
	return page.getByTestId("button-primitive");
}
