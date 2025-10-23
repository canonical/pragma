/* @canonical/generator-ds 0.9.0-experimental.12 */
import {
	type ReactElement,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import type { AnatomyProps } from "./types.js";
import "./styles.css";
import { Edge } from "./common/index.js";
import { useAnatomy, useMousePosition } from "./hooks/index.js";

const componentCssClassName = "ds anatomy";
/**
 * Anatomy visualization component for Design System DSL
 * @returns {React.ReactElement} - Rendered Anatomy
 */
const Anatomy = ({
	className,
	yamlContent,
	children,
}: AnatomyProps): ReactElement => {
	const { parsedAnatomy, parseError } = useAnatomy({ yamlContent });

	// 3D visualization state
	const [is3DEnabled, setIs3DEnabled] = useState(false);
	const [depthMultiplier, setDepthMultiplier] = useState(50);
	const visualizationRef = useRef<HTMLDivElement>(null);

	const { mousePosition, handleMouseMove, handleMouseLeave } = useMousePosition(
		{
			containerRef: visualizationRef,
			enabled: is3DEnabled,
			centerOnLeave: true,
		},
	);

	const toggle3D = useCallback(() => {
		setIs3DEnabled((prev) => !prev);
	}, []);

	const transform3D = useMemo(() => {
		if (!is3DEnabled) return "";
		// Invert rotation to simulate camera orbiting around the anatomy
		// mousePosition ranges from -0.5 to 0.5, multiply by 180 for ±90 degree orbit
		const rotateY = mousePosition.x * 70;
		const rotateX = -mousePosition.y * 90;
		return `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
	}, [is3DEnabled, mousePosition]);

	return (
		<div
			className={[componentCssClassName, className].filter(Boolean).join(" ")}
		>
			<div className="controls">
				<label className="checkbox-wrapper">
					<input
						type="checkbox"
						checked={is3DEnabled}
						onChange={toggle3D}
						aria-label="Enable 3D visualization"
					/>
					<span>Enable 3D Visualization</span>
				</label>
				<label className="checkbox-wrapper">
					<span>Depth: {depthMultiplier}px</span>
					<input
						type="range"
						min="0"
						max="60"
						step="5"
						value={depthMultiplier}
						onChange={(e) => setDepthMultiplier(Number(e.target.value))}
						aria-label="Adjust depth multiplier"
					/>
				</label>
			</div>

			<div
				ref={visualizationRef}
				className={`visualization ${is3DEnabled ? "enabled-3d" : ""}`}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				style={{
					"--is-3d-enabled": is3DEnabled ? Number(1) : 0,
					"--depth-multiplier": depthMultiplier,
				}}
			>
				{parseError ? (
					<span className="error" role="alert">
						{parseError}
					</span>
				) : parsedAnatomy ? (
					<div
						className="tree"
						style={
							{
								transform: transform3D,
							} as React.CSSProperties
						}
					>
						{(() => {
							const uri = Object.keys(parsedAnatomy)[0];
							const node = parsedAnatomy[uri];
							return <Edge node={node} uri={uri} />;
						})()}
					</div>
				) : (
					<div className="empty">Enter YAML to visualize</div>
				)}
			</div>
			{children}
		</div>
	);
};

export default Anatomy;
