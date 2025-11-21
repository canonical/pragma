/* @canonical/generator-ds 0.10.0-experimental.5 */

import type React from "react";
import type { GridDemoProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds grid-demo";

/**
 * description of the GridDemo component
 */
const GridDemo = ({
	className,
	children,
	// gridType = "fixed",
	// gridType = "fixed-responsive",
	gridType = "fluid",
	exampleVariant = "navigation",
	...props
}: GridDemoProps): React.ReactElement => {
	switch (exampleVariant) {
		case "navigation":
			return (
				<div
					className={[
						componentCssClassName,
						`grid-${gridType}`,
						className,
						"navigation",
					]
						.filter(Boolean)
						.join(" ")}
					{...props}
				>
					<nav>Top navigation bar</nav>
					<aside>Sidebar</aside>
					<main>
						{[...Array(10)].map((_, index) => (
							<div className="box">Lorem ipsum dolor sit amet.</div>
						))}
						<div className="intrinsic-box">Intrinsic width box</div>
					</main>
				</div>
			);
		default:
			return (
				<div
					className={[componentCssClassName, `grid-${gridType}`, className]
						.filter(Boolean)
						.join(" ")}
					{...props}
				>
					<div className="box">Lorem ipsum dolor sit amet.</div>
					<div className="box">Lorem ipsum dolor sit amet.</div>
					<div className="box">Lorem ipsum dolor sit amet.</div>
					<div className="box">Lorem ipsum dolor sit amet.</div>
					<div className="box">Lorem ipsum dolor sit amet.</div>
					<div className="row">Takes all the row width</div>
				</div>
			);
	}
};

export default GridDemo;
