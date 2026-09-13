import type React from "react";
import { graphql, useFragment } from "react-relay";
import type { PropertiesSection_component$key } from "#relay/__generated__/PropertiesSection_component.graphql.js";
import propertiesSectionFragmentNode from "#relay/__generated__/PropertiesSection_component.graphql.js";
import type { PropertiesSectionProps } from "./types.js";
import "./styles.css";

/**
 * Codegen source of truth for `PropertiesSection_component` (see
 * `EntityHeader` for why the hook consumes the generated artifact instead:
 * this module rides the server bricks' native import chain). Never invoked.
 */
const propertiesSectionFragmentSource = (): unknown => graphql`
  fragment PropertiesSection_component on Component {
    properties {
      name
      propertyType
      optional
      defaultValue
      constraints
      summary
    }
  }
`;
void propertiesSectionFragmentSource;

const componentCssClassName = "ds properties-section";

/**
 * The entity's configurable properties as a table. Cells are PLAIN TEXT by
 * ruling R8 (no markdown rendering in v1): some live property names carry
 * raw markdown asterisks, and they render verbatim rather than styled.
 * `properties` is a plain list in the schema (no connection), so the rows
 * are exactly what the graph carries.
 */
const PropertiesSection = ({
  className,
  component,
}: PropertiesSectionProps): React.ReactElement => {
  const data = useFragment<PropertiesSection_component$key>(
    propertiesSectionFragmentNode,
    component,
  );

  return (
    <section
      aria-labelledby="component-entity-properties"
      className={[componentCssClassName, className].filter(Boolean).join(" ")}
    >
      <h2 id="component-entity-properties">Properties</h2>
      {data.properties.length === 0 ? (
        <p>No properties recorded.</p>
      ) : (
        <div className="properties-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Optional</th>
                <th scope="col">Default</th>
                <th scope="col">Constraints</th>
                <th scope="col">Summary</th>
              </tr>
            </thead>
            <tbody>
              {/* Properties carry no id; the key derives from row content
                  (never the array index): the list re-renders whole from
                  the store and is never reordered in place. */}
              {data.properties.map((property) => (
                <tr
                  key={`${property.name ?? ""}:${property.propertyType ?? ""}:${property.defaultValue ?? ""}`}
                >
                  <th scope="row">{property.name}</th>
                  <td>{property.propertyType}</td>
                  <td>
                    {property.optional == null
                      ? ""
                      : property.optional
                        ? "yes"
                        : "no"}
                  </td>
                  <td>{property.defaultValue}</td>
                  <td>{property.constraints}</td>
                  <td>{property.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default PropertiesSection;
