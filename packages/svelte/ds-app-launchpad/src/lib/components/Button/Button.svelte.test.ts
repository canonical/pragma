import type { Locator } from "@vitest/browser/context";
import { createRawSnippet } from "svelte";
import type { ComponentProps, Snippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import type { RenderResult } from "vitest-browser-svelte";
import Component from "./Button.svelte";

describe("Button component", () => {
	const baseProps = {
		children: createRawSnippet(() => ({
			render: () => `<span>Button</span>`,
		})),
		"data-testid": "button",
	} satisfies ComponentProps<typeof Component>;

	it("renders", async () => {
		const page = render(Component, { ...baseProps });
		await expect.element(componentLocator(page)).toBeInTheDocument();
		await expect.element(page.getByText("Button")).toBeVisible();
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
			await expect.element(componentLocator(page)).toHaveClass("ds");
			await expect.element(componentLocator(page)).toHaveClass("button");
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

	describe("rendering", () => {
		it("renders as a button by default", async () => {
			const page = render(Component, { ...baseProps });
			await expect
				.element(page.getByRole("button"))
				.toBeInTheDocument();
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

		it("renders with icons", async () => {
			const iconLeft: Snippet = createRawSnippet(() => ({
				render: () => `<span data-testid="icon-left">L</span>`,
			}));
			const iconRight: Snippet = createRawSnippet(() => ({
				render: () => `<span data-testid="icon-right">R</span>`,
			}));
			const page = render(Component, {
				...baseProps,
				iconLeft,
				iconRight,
			});
			await expect
				.element(page.getByTestId("icon-left"))
				.toBeInTheDocument();
			await expect
				.element(page.getByTestId("icon-right"))
				.toBeInTheDocument();
		});
	});

	describe("modifiers", () => {
		it("applies severity class", async () => {
			const page = render(Component, {
				...baseProps,
				severity: "brand",
			});
			await expect
				.element(componentLocator(page))
				.toHaveClass("brand");
		});

		it("applies density class", async () => {
			const page = render(Component, {
				...baseProps,
				density: "dense",
			});
			await expect
				.element(componentLocator(page))
				.toHaveClass("dense");
		});
	});

	describe("disabled state", () => {
		it("disables the button when disabled", async () => {
			const page = render(Component, {
				...baseProps,
				disabled: true,
			});
			await expect.element(page.getByRole("button")).toBeDisabled();
			await expect
				.element(componentLocator(page))
				.toHaveClass("explicit-disabled");
		});

		it("disables the button when loading", async () => {
			const page = render(Component, {
				...baseProps,
				loading: true,
			});
			await expect.element(page.getByRole("button")).toBeDisabled();
			await expect
				.element(componentLocator(page))
				.toHaveClass("loading");
		});

		it("does not apply explicit-disabled class when loading", async () => {
			const page = render(Component, {
				...baseProps,
				loading: true,
			});
			await expect
				.element(componentLocator(page))
				.not.toHaveClass("explicit-disabled");
		});
	});

	describe("interactions", () => {
		it("handles click events", async () => {
			const onclick = vi.fn();
			const page = render(Component, { ...baseProps, onclick });
			await page.getByRole("button").click();
			expect(onclick).toHaveBeenCalled();
		});
	});
});

function componentLocator(page: RenderResult<typeof Component>): Locator {
	return page.getByTestId("button");
}
