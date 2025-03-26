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
	items,
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
			{items.map((item, index) => {
				const keyValue = item[valueKey];
				const key = keyValue !== undefined ? String(keyValue) : `item-${index}`;
				return (
					<li
						{...getItemProps({
							item: item,
							index,
							style: {
								backgroundColor:
									highlightedIndex === index ? "yellow" : "white",
								fontWeight: fieldValue === item[valueKey] ? "bold" : "normal",
							},
						})}
						key={key}
					>
						{convertItemToString(item)}
					</li>
				);
			})}
		</ul>
	);
};

export default List;
