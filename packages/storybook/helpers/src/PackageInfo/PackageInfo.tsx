import { FRAMEWORK_LABELS, STATUS_LABELS, TIER_LABELS } from "./constants.js";
import type { PackageInfoProps } from "./types.js";

import "./PackageInfo.css";

/**
 * Displays package metadata as a compact header and table.
 *
 * @example
 * ```tsx
 * <PackageInfo
 *   name="@canonical/react-ds-global"
 *   version="1.2.0"
 *   tier="global"
 *   framework="react"
 *   status="stable"
 *   dependencies={["@canonical/ds-types", "@canonical/styles"]}
 *   links={{
 *     source: "https://github.com/canonical/design-system",
 *   }}
 * />
 * ```
 */
export function PackageInfo({
  name,
  version,
  tier,
  framework,
  status = "stable",
  dependencies,
  links,
  className,
}: PackageInfoProps) {
  const tierLabel = TIER_LABELS[tier];
  const frameworkLabel = FRAMEWORK_LABELS[framework];
  const statusLabel = STATUS_LABELS[status];

  return (
    <section
      className={["package-info", className].filter(Boolean).join(" ")}
      aria-label={`Package information for ${name}`}
    >
      <h2 className="name">
        {name}
        {version && <span className="version">v{version}</span>}
      </h2>

      <table>
        <tbody>
          <tr>
            <th>Tier</th>
            <td>{tierLabel}</td>
          </tr>
          <tr>
            <th>Framework</th>
            <td>{frameworkLabel}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>
              <span className={`status status-${status}`}>{statusLabel}</span>
            </td>
          </tr>
          {dependencies && dependencies.length > 0 && (
            <tr>
              <th>Dependencies</th>
              <td>
                {dependencies.map((dep, i) => (
                  <span key={dep}>
                    <code>{dep}</code>
                    {i < dependencies.length - 1 && ", "}
                  </span>
                ))}
              </td>
            </tr>
          )}
          {links?.source && (
            <tr>
              <th>Source</th>
              <td>
                <a
                  href={links.source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {links.source.replace("https://github.com/", "")}
                </a>
              </td>
            </tr>
          )}
          {links?.ontology && (
            <tr>
              <th>Ontology</th>
              <td>
                <a
                  href={links.ontology}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {links.ontology.replace("https://github.com/", "")}
                </a>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export default PackageInfo;
