/* @canonical/generator-ds 0.9.0-experimental.9 */
import type React from "react";
import type { ListProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds combobox-list";

/**
 * description of the List component
 * @returns {React.ReactElement} - Rendered List
 */
const List = ({
	className,
	style,
	options,
	getMenuProps,
	getItemProps,
	highlightedIndex,
	convertItemToString,
	fieldValue,
	valueKey,
	isOpen,
}: ListProps): React.ReactElement => {
	return (
		<ul
			className={[componentCssClassName, className, isOpen && "is-open"]
				.filter((e) => e)
				.join(" ")}
			style={style}
			{...getMenuProps()}
		>
			{options.map((option, index) => (
				<li
					{...getItemProps({
						option,
						index,
						key: option?.[valueKey],
						style: {
							backgroundColor: highlightedIndex === index ? "yellow" : "white",
							fontWeight: fieldValue === option[valueKey] ? "bold" : "normal",
						},
					})}
				>
					{convertItemToString(option)}
				</li>
			))}
		</ul>
	);
};

export default List;
