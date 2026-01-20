import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PackageInfo } from "./PackageInfo.js";

describe("PackageInfo", () => {
  it("renders package name and version", () => {
    render(
      <PackageInfo
        name="@canonical/test-package"
        version="1.0.0"
        tier="global"
        framework="react"
      />,
    );
    expect(screen.getByText("@canonical/test-package")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
  });

  it("renders tier and framework", () => {
    render(
      <PackageInfo
        name="@canonical/test"
        tier="global"
        framework="react"
      />,
    );
    expect(screen.getByText("Global")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("renders status with correct class", () => {
    render(
      <PackageInfo
        name="@canonical/test"
        tier="global"
        framework="react"
        status="prerelease"
      />,
    );
    const status = screen.getByText("Prerelease");
    expect(status).toHaveClass("status", "status-prerelease");
  });

  it("renders dependencies", () => {
    render(
      <PackageInfo
        name="@canonical/test"
        tier="global"
        framework="react"
        dependencies={["@canonical/dep-a", "@canonical/dep-b"]}
      />,
    );
    expect(screen.getByText("@canonical/dep-a")).toBeInTheDocument();
    expect(screen.getByText("@canonical/dep-b")).toBeInTheDocument();
  });

  it("renders source link", () => {
    render(
      <PackageInfo
        name="@canonical/test"
        tier="global"
        framework="react"
        links={{ source: "https://github.com/canonical/pragma" }}
      />,
    );
    const link = screen.getByRole("link", { name: "canonical/pragma" });
    expect(link).toHaveAttribute("href", "https://github.com/canonical/pragma");
  });

  it("has accessible section label", () => {
    render(
      <PackageInfo
        name="@canonical/test-pkg"
        tier="global"
        framework="react"
      />,
    );
    expect(
      screen.getByRole("region", { name: "Package information for @canonical/test-pkg" }),
    ).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <PackageInfo
        name="@canonical/test"
        tier="global"
        framework="react"
        className="custom-class"
      />,
    );
    expect(screen.getByRole("region")).toHaveClass("package-info", "custom-class");
  });
});
