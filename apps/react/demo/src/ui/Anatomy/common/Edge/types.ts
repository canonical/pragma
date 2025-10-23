/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { HTMLAttributes } from "react";

export interface EdgeRelation {
	/** Cardinality of the relation (e.g., "1", "0..1", "1..*") */
	cardinality: string;
	/** Optional slot name for the relation */
	slotName?: string;
}

export interface EdgeProps extends HTMLAttributes<HTMLDivElement> {
	/** The node data object */
	node: any;
	/** URI of the node */
	uri: string;
	/** Optional relation from parent to this node */
	relation?: EdgeRelation;
	/** Nesting depth level for visual hierarchy */
	depth?: number;
	/** Index in the sibling array for positioning */
	index?: number;
}
