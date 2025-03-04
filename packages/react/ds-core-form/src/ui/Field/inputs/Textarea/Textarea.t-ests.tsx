/* @canonical/generator-ds 0.9.0-experimental.4 */

import { render, screen } from "@testing-library/react";
import * as decorators from "storybook/decorators.js";
import { beforeEach, describe, expect, it } from "vitest";
import Component from "./Textarea.js";

describe("Textarea component", () => {
	// beforeEach((context) => {
	//   context.test = decorators.form()(context.test);
	// });
	it("renders", () => {
		render(<Component name="content">Textarea</Component>);
		expect(screen.getByText("Textarea")).toBeInTheDocument();
	});

	it("applies className", () => {
		render(<Component className={"test-class"} name="content" />);
		expect(screen.getByText("Textarea")).toHaveClass("test-class");
	});
});
