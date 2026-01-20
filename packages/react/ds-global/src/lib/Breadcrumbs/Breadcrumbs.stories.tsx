import type { Meta, StoryObj } from "@storybook/react-vite";
import Component from "./Breadcrumbs.js";
import type { BreadcrumbItem } from "./types.js";

const meta = {
	title: "Breadcrumbs",
	component: Component,
	tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default breadcrumbs with three levels of navigation.
 */
export const Default: Story = {
	args: {
		items: [
			{ url: "/", label: "Home" },
			{ url: "/products", label: "Products" },
			{ key: "details", label: "Product Details", current: true },
		],
	},
};

/**
 * Breadcrumbs with only two levels.
 */
export const TwoLevels: Story = {
	args: {
		items: [
			{ url: "/", label: "Home" },
			{ key: "about", label: "About", current: true },
		],
	},
};

/**
 * Breadcrumbs with deep navigation hierarchy.
 */
export const ManyLevels: Story = {
	args: {
		items: [
			{ url: "/", label: "Ubuntu" },
			{ url: "/server", label: "Server" },
			{ url: "/server/docs", label: "Docs" },
			{ url: "/server/docs/installation", label: "Installation" },
			{ key: "autoinstall", label: "Autoinstall", current: true },
		],
	},
};

/**
 * Breadcrumbs using a custom separator character.
 */
export const CustomSeparator: Story = {
	args: {
		separator: "›",
		items: [
			{ url: "/", label: "Home" },
			{ url: "/products", label: "Products" },
			{ key: "details", label: "Details", current: true },
		],
	},
};

/**
 * Breadcrumbs with custom aria-label for accessibility.
 */
export const WithCustomAriaLabel: Story = {
	args: {
		"aria-label": "You are here",
		items: [
			{ url: "/", label: "Home" },
			{ key: "settings", label: "Settings", current: true },
		],
	},
};

/**
 * Breadcrumbs with a custom item component.
 * Demonstrates the switch pattern for custom rendering.
 */
const CustomItem = ({ label, url, current, separator }: BreadcrumbItem & { separator?: React.ReactNode }) => (
	<li className="ds breadcrumbs-item custom">
		{current ? (
			<strong className="link" aria-current="page">{label}</strong>
		) : (
			<a className="link" href={url} style={{ textDecoration: "underline" }}>
				{label}
			</a>
		)}
		<span className="separator" aria-hidden="true">
			{separator}
		</span>
	</li>
);

export const WithCustomComponent: Story = {
	args: {
		items: [
			{ url: "/", label: "Home", Component: CustomItem },
			{ url: "/docs", label: "Documentation", Component: CustomItem },
			{ key: "api", label: "API Reference", current: true, Component: CustomItem },
		],
	},
};
