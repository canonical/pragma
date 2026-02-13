import type { ElementType, ReactNode } from "react";

export const rtl = () => (Story: ElementType) => (
	<div dir="rtl">
		<Story />
	</div>
);

export const grid = () => (Story: ElementType) => (
	<div
		style={{
			display: "grid",
			gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
			gap: "1em",
		}}
	>
		<Story />
	</div>
);

export const threeColumnGrid = () => (Story: ElementType) => (
	<div
		style={{
			display: "grid",
			gridTemplateColumns: "repeat(3, 1fr)",
			height: "100%",
		}}
	>
		<Story />
	</div>
);

export const fluidGrid = () => (Story: ElementType) => (
	<div
		style={{
			display: "grid",
			gridTemplateColumns:
				"repeat( auto-fit, minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr))",
			height: "100%",
		}}
	>
		<Story />
	</div>
);

/**
 * Places the story before a `<main>` element. This is useful for stories that need to be placed before the rest of the page contents in reading order (such as a skip link).
 * @param id - The id of the main element
 * @param children - Content to be rendered inside the main element
 * @TODO this is the first decorator that seems like it may deserve a complex props object, and thus a separate Type.
 *      Should the type be declared separately? Should this be a separate file? Should the decorator be simplified somehow?
 */
export const beforeMain =
	({ id = "main", children }: { id?: string; children?: ReactNode }) =>
	(Story: ElementType) => (
		<>
			<Story />
			<main id={id} tabIndex={-1}>
				{children}
			</main>
		</>
	);
