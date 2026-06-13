// =============================================================================
// Query-depth validation rule. graphql-js ships no depth limit, so a schema
// with cyclic types (work → authors → works → authors → …) accepts arbitrarily
// nested operations. This rule rejects any operation whose selection-set
// nesting exceeds maxDepth, resolving named fragment spreads (with a cycle
// guard) and inline fragments — neither of which adds a level of its own.
// =============================================================================

import {
  type ASTVisitor,
  type FragmentDefinitionNode,
  GraphQLError,
  Kind,
  type SelectionSetNode,
  type ValidationContext,
} from "graphql";

/**
 * Create a validation rule that fails any operation nested deeper than
 * `maxDepth` selection sets. A leaf field is depth 1; `{ a { b } }` is depth
 * 2. Fragment spreads and inline fragments are transparent to the count.
 */
export default function createDepthLimitRule(
  maxDepth: number,
): (context: ValidationContext) => ASTVisitor {
  return (context) => {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const def of context.getDocument().definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) {
        fragments.set(def.name.value, def);
      }
    }

    const depthOf = (
      selectionSet: SelectionSetNode | undefined,
      seenFragments: ReadonlySet<string>,
    ): number => {
      if (!selectionSet) {
        return 0;
      }
      let deepest = 0;
      for (const selection of selectionSet.selections) {
        if (selection.kind === Kind.FIELD) {
          const below = depthOf(selection.selectionSet, seenFragments);
          deepest = Math.max(deepest, 1 + below);
        } else if (selection.kind === Kind.INLINE_FRAGMENT) {
          // Inline fragments do not add a level — their selections sit at the
          // current depth.
          deepest = Math.max(
            deepest,
            depthOf(selection.selectionSet, seenFragments),
          );
        } else {
          // Fragment spread: expand the named fragment, guarding cycles.
          const name = selection.name.value;
          if (seenFragments.has(name)) {
            continue;
          }
          const fragment = fragments.get(name);
          if (fragment) {
            deepest = Math.max(
              deepest,
              depthOf(fragment.selectionSet, new Set([...seenFragments, name])),
            );
          }
        }
      }
      return deepest;
    };

    return {
      OperationDefinition(node) {
        const depth = depthOf(node.selectionSet, new Set());
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(
              `Query exceeds maximum depth of ${maxDepth} (depth ${depth})`,
              { nodes: [node] },
            ),
          );
        }
      },
    };
  };
}
