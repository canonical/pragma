import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Breadcrumbs from "./Breadcrumbs.js";

describe("Breadcrumbs", () => {
	it("renders items", () => {
		render(
			<Breadcrumbs
				items={[
					{ url: "/", label: "Home" },
					{ url: "/products", label: "Products" },
				]}
			/>,
		);
		expect(screen.getByText("Home")).toBeInTheDocument();
		expect(screen.getByText("Products")).toBeInTheDocument();
	});

	it("renders as nav element with aria-label", () => {
		render(
			<Breadcrumbs data-testid="nav" items={[{ url: "/", label: "Home" }]} />,
		);
		const nav = screen.getByTestId("nav");
		expect(nav.tagName).toBe("NAV");
		expect(nav).toHaveAttribute("aria-label", "Breadcrumb");
	});

	it("allows custom aria-label", () => {
		render(
			<Breadcrumbs
				aria-label="Site navigation"
				data-testid="nav"
				items={[{ url: "/", label: "Home" }]}
			/>,
		);
		expect(screen.getByTestId("nav")).toHaveAttribute(
			"aria-label",
			"Site navigation",
		);
	});

	it("applies ds breadcrumbs class", () => {
		render(
			<Breadcrumbs data-testid="nav" items={[{ url: "/", label: "Home" }]} />,
		);
		expect(screen.getByTestId("nav")).toHaveClass("ds", "breadcrumbs");
	});

	it("renders Item with link", () => {
		render(<Breadcrumbs items={[{ url: "/test", label: "Test Link" }]} />);
		const link = screen.getByText("Test Link");
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", "/test");
	});

	it("renders current Item without link", () => {
		render(
			<Breadcrumbs
				items={[{ key: "current", label: "Current Page", current: true }]}
			/>,
		);
		const current = screen.getByText("Current Page");
		expect(current.tagName).toBe("SPAN");
		expect(current).toHaveAttribute("aria-current", "page");
	});

	it("renders separator between items", () => {
		render(
			<Breadcrumbs
				items={[
					{ url: "/", label: "Home" },
					{ key: "page", label: "Page", current: true },
				]}
			/>,
		);
		const separators = screen.getAllByText("/");
		// Both items have separators, last one hidden via CSS
		expect(separators[0]).toHaveAttribute("aria-hidden", "true");
	});

	it("uses custom separator", () => {
		render(
			<Breadcrumbs
				separator="›"
				items={[
					{ url: "/", label: "Home" },
					{ key: "page", label: "Page", current: true },
				]}
			/>,
		);
		expect(screen.getAllByText("›")).toHaveLength(2);
	});

	it("maintains DOM order: link before separator", () => {
		render(
			<Breadcrumbs
				items={[{ url: "/", label: "Home", className: "test-item" }]}
			/>,
		);
		const item = document.querySelector(".test-item");
		const children = item?.children;
		expect(children?.[0]).toHaveClass("link");
		expect(children?.[1]).toHaveClass("separator");
	});

	it("uses custom LinkComponent", () => {
		const CustomLink = ({
			href,
			children,
			className,
		}: {
			href?: string;
			children?: React.ReactNode;
			className?: string;
		}) => (
			<a href={href} className={className} data-custom="true">
				{children}
			</a>
		);

		render(
			<Breadcrumbs
				LinkComponent={CustomLink}
				items={[{ url: "/", label: "Home" }]}
			/>,
		);
		const link = screen.getByText("Home");
		expect(link).toHaveAttribute("data-custom", "true");
	});

	it("renders custom Component when provided in item", () => {
		const CustomItem = ({ label }: { label?: string }) => (
			<li data-testid="custom-item">{label}</li>
		);

		render(
			<Breadcrumbs
				items={[
					{ url: "/", label: "Home" },
					{ key: "custom", label: "Custom", Component: CustomItem },
				]}
			/>,
		);
		expect(screen.getByTestId("custom-item")).toBeInTheDocument();
		expect(screen.getByText("Custom")).toBeInTheDocument();
	});

	it("uses url as key, falls back to key prop", () => {
		render(
			<Breadcrumbs
				items={[
					{ url: "/home", label: "Home" },
					{ key: "no-url", label: "No URL" },
				]}
			/>,
		);
		// Both items should render without key errors
		expect(screen.getByText("Home")).toBeInTheDocument();
		expect(screen.getByText("No URL")).toBeInTheDocument();
	});
});
