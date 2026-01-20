import { MODIFIER_FAMILIES } from "@canonical/ds-types";
import type { ComponentType, ReactNode } from "react";

/**
 * Configuration for a single modifier axis in the matrix.
 * Each axis represents one dimension of variation (e.g., importance, anticipation).
 */
export interface ModifierAxis<T extends string = string> {
	/** Human-readable name for this modifier family */
	name: string;
	/** The prop name to pass to the component */
	prop: string;
	/** Available values for this modifier, in display order */
	values: readonly T[];
	/** Optional labels for values (defaults to value names) */
	labels?: Partial<Record<T, string>>;
}

/**
 * Props for the ModifierMatrix component.
 */
export interface ModifierMatrixProps<
	TRow extends string = string,
	TCol extends string = string,
> {
	/** The component to render in each cell */
	component: ComponentType<Record<string, unknown>>;

	/** Configuration for row axis (vertical) */
	rowAxis: ModifierAxis<TRow>;

	/** Configuration for column axis (horizontal) */
	columnAxis: ModifierAxis<TCol>;

	/**
	 * Whether to include a "none" option for each axis.
	 * - true: Include "none" for both axes
	 * - "row": Include "none" only for row axis
	 * - "column": Include "none" only for column axis
	 * - false: No "none" options
	 * @default true
	 */
	includeNone?: boolean | "row" | "column";

	/**
	 * Label for the "none" option.
	 * @default "Default"
	 */
	noneLabel?: string;

	/**
	 * Base props to pass to every component instance.
	 * These are merged with the modifier props.
	 */
	baseProps?: Record<string, unknown>;

	/**
	 * Optional render function for custom cell content.
	 * If not provided, renders the component with modifier props.
	 */
	renderCell?: (props: {
		rowValue: TRow | undefined;
		colValue: TCol | undefined;
		Component: ComponentType<Record<string, unknown>>;
		baseProps: Record<string, unknown>;
	}) => ReactNode;

	/**
	 * Optional title displayed above the matrix.
	 */
	title?: string;

	/**
	 * Optional CSS class name for the matrix container.
	 */
	className?: string;
}

/**
 * Helper to capitalize and format modifier values for display.
 */
function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

/**
 * Creates a ModifierAxis configuration from the MODIFIER_FAMILIES constant.
 * This ensures type safety and synchronization with @canonical/ds-types.
 */
function createAxis<K extends keyof typeof MODIFIER_FAMILIES>(
	key: K,
	name?: string,
): ModifierAxis<(typeof MODIFIER_FAMILIES)[K][number]> {
	return {
		name: name ?? capitalize(key),
		prop: key,
		values: MODIFIER_FAMILIES[key],
	};
}

/**
 * Pre-configured modifier axis definitions derived from @canonical/ds-types.
 * These are automatically synchronized with the MODIFIER_FAMILIES constant.
 *
 * @example
 * ```tsx
 * import { ModifierMatrix, MODIFIER_AXES } from "@canonical/storybook-helpers";
 *
 * <ModifierMatrix
 *   component={Button}
 *   rowAxis={MODIFIER_AXES.importance}
 *   columnAxis={MODIFIER_AXES.anticipation}
 *   baseProps={{ children: "Button" }}
 * />
 * ```
 */
export const MODIFIER_AXES = {
	anticipation: createAxis("anticipation", "Anticipation"),
	criticality: createAxis("criticality", "Criticality"),
	density: createAxis("density", "Density"),
	emphasis: createAxis("emphasis", "Emphasis"),
	importance: createAxis("importance", "Importance"),
	lifecycle: createAxis("lifecycle", "Lifecycle"),
	release: createAxis("release", "Release"),
	severity: createAxis("severity", "Severity"),
} as const;

export type ModifierAxisName = keyof typeof MODIFIER_AXES;
