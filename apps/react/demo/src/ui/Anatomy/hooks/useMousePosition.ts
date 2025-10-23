/* @canonical/generator-ds 0.9.0-experimental.12 */

import { throttle } from "@canonical/utils";
import { type RefObject, useCallback, useState } from "react";

export interface MousePosition {
	x: number;
	y: number;
}

interface UseMousePositionProps {
	/** Ref to the element to calculate position relative to */
	containerRef: RefObject<HTMLElement>;
	/** Whether mouse position tracking is enabled */
	enabled?: boolean;
	/** Throttle delay in milliseconds */
	throttleMs?: number;
	/** Whether to center position on mouse leave (defaults to false) */
	centerOnLeave?: boolean;
}

interface UseMousePositionResult {
	/** Current normalized mouse position (x and y range from -0.5 to 0.5, center is 0,0) */
	mousePosition: MousePosition;
	/** Mouse move handler to attach to the tracking element */
	handleMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
	/** Mouse leave handler to optionally center position */
	handleMouseLeave: () => void;
}

/**
 * Hook to track mouse position relative to a container element
 * @param props - Configuration options including the container ref
 * @returns Mouse position state and event handlers
 */
const useMousePosition = ({
	containerRef,
	enabled = true,
	throttleMs = 16,
	centerOnLeave = false,
}: UseMousePositionProps): UseMousePositionResult => {
	const [mousePosition, setMousePosition] = useState<MousePosition>({
		x: 0,
		y: 0,
	});

	const handleMouseMove = useCallback(
		throttle((e: React.MouseEvent<HTMLElement>) => {
			if (!enabled || !containerRef.current) return;

			const rect = containerRef.current.getBoundingClientRect();
			const x = (e.clientX - rect.left) / rect.width - 0.5;
			const y = (e.clientY - rect.top) / rect.height - 0.5;

			setMousePosition({ x, y });
		}, throttleMs),
		[enabled, throttleMs, containerRef],
	);

	const handleMouseLeave = useCallback(() => {
		if (centerOnLeave) {
			setMousePosition({ x: 0, y: 0 });
		}
	}, [centerOnLeave]);

	return {
		mousePosition,
		handleMouseMove,
		handleMouseLeave,
	};
};

export default useMousePosition;
