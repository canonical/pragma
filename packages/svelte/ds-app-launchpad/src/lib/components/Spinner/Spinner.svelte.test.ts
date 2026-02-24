import type { Locator } from "@vitest/browser/context";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import type { RenderResult } from "vitest-browser-svelte";
import Component from "./Spinner.svelte";

describe("Spinner component", () => {
	const baseProps = {} satisfies ComponentProps<typeof Component>;

	it("renders", async () => {
		const page = render(Component, { ...baseProps });
		await expect
			.element(page.getByLabelText("Loading"))
			.toBeInTheDocument();
	});

	describe("attributes", () => {
		it("applies classes", async () => {
			const page = render(Component, {
				...baseProps,
				class: "test-class",
			});
			await expect
				.element(page.getByLabelText("Loading"))
				.toHaveClass("test-class");
			await expect
				.element(page.getByLabelText("Loading"))
				.toHaveClass("ds");
			await expect
				.element(page.getByLabelText("Loading"))
				.toHaveClass("spinner");
		});
	});
});
