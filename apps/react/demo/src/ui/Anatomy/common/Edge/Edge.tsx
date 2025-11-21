/* @canonical/generator-ds 0.10.0-experimental.5 */
import { type ReactElement, useMemo } from "react";
import type { EdgeProps } from "./types.js";
import "./styles.css";

const componentCssClassName = "ds anatomy-edge";

/**
 * Edge component - Recursively renders a node and its relation in the anatomy tree
 * @returns {React.ReactElement} - Rendered edge
 */
const Edge = ({
  node,
  uri,
  relation,
  depth = 0,
  index = 0,
  className,
  ...props
}: EdgeProps): ReactElement => {
  const invariantStyles = useMemo(() => {
    if (!node.invariantStyles) return {};
    return Object.entries(node.invariantStyles).reduce(
      (acc, [key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        acc[cssKey] = value as string;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [node.invariantStyles]);

  const edgeStyle = useMemo(
    () =>
      ({
        "--depth": depth,
      }) as React.CSSProperties,
    [depth],
  );

  return (
    <div key={`${uri}-${depth}-${index}`} className="edge-wrapper">
      <div
        className={[componentCssClassName, className].filter(Boolean).join(" ")}
        style={edgeStyle}
        // style={invariantStyles}
        {...props}
      >
        <div className="edge-header">
          <span className="edge-uri">{uri}</span>
          {relation && (
            <span className="cardinality">[{relation.cardinality}]</span>
            /*
							{relation.slotName && (
								<span className="slot">
									slot: {relation.slotName}
								</span>
							)}
              */
          )}
        </div>

        {node.edges && node.edges.length > 0 && (
          <div className="children">
            {node.edges.map((childEdge: any, idx: number) => (
              <Edge
                key={`edge-${idx}`}
                node={childEdge.node}
                uri={childEdge.node.uri}
                relation={childEdge.relation}
                depth={depth + 1}
                index={idx}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Edge;
