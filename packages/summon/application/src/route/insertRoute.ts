import ts from "typescript";

/**
 * Peel `as const` / type assertions / parentheses off an initializer to reach
 * the underlying object literal (e.g. `{ ... } as const`), if any.
 */
function unwrapObjectLiteral(
  expr: ts.Expression,
): ts.ObjectLiteralExpression | undefined {
  let node: ts.Expression = expr;
  while (
    ts.isAsExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isSatisfiesExpression(node)
  ) {
    node = node.expression;
  }
  return ts.isObjectLiteralExpression(node) ? node : undefined;
}

export interface RouteInsertion {
  /** Imported page component, e.g. "InvoicesPage". */
  readonly pageName: string;
  /** Import specifier, e.g. "./InvoicesPage.js". */
  readonly importPath: string;
  /** Route key in the routes object, e.g. "invoices". */
  readonly routeKey: string;
  /** Route URL, e.g. "/billing/invoices". */
  readonly url: string;
}

/**
 * Insert a route into a domain `routes.ts` source.
 *
 * Uses the TypeScript compiler API only to *locate* the insertion points (the
 * last import declaration and the `routes` object literal), then splices text
 * at those offsets. Locating with the AST is robust to formatting; editing by
 * string keeps the rest of the file byte-for-byte unchanged (no full re-print,
 * so it doesn't fight the formatter).
 *
 * Idempotent: if `routeKey` already exists in the routes object, the source is
 * returned unchanged. Throws if the `routes` object literal cannot be found.
 */
export function insertRoute(source: string, ins: RouteInsertion): string {
  const sf = ts.createSourceFile(
    "routes.ts",
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  // Locate the `routes` object literal and the last import declaration.
  let routesObject: ts.ObjectLiteralExpression | undefined;
  let lastImportEnd: number | undefined;

  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt)) {
      lastImportEnd = stmt.end;
      continue;
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === "routes" &&
          decl.initializer
        ) {
          const obj = unwrapObjectLiteral(decl.initializer);
          if (obj) routesObject = obj;
        }
      }
    }
  }

  if (!routesObject) {
    throw new Error(
      "insertRoute: could not find a `const routes = { ... }` object literal",
    );
  }

  // Idempotency: skip if the key is already present.
  const exists = routesObject.properties.some(
    (p) =>
      p.name &&
      (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
      p.name.text === ins.routeKey,
  );
  if (exists) return source;

  // Indentation of the existing properties (fall back to two spaces).
  const indent = detectIndent(source, routesObject) ?? "  ";

  const importLine = `import ${ins.pageName} from "${ins.importPath}";\n`;
  const entry =
    `${indent}${ins.routeKey}: route({\n` +
    `${indent}${indent}url: "${ins.url}",\n` +
    `${indent}${indent}content: ${ins.pageName},\n` +
    `${indent}}),\n`;

  // Insert after the last existing property, or — for an empty object — just
  // inside the braces. Use AST node bounds, never a brace text-scan (which can
  // match a nested `route({ ... })` brace on a single-line object).
  const props = routesObject.properties;
  let out: string;
  if (props.length > 0) {
    const last = props[props.length - 1];
    // Find the insertion point: just after the last property, including its
    // trailing comma if it has one (so the existing comma stays attached to the
    // existing property). If there's no trailing comma, add one.
    let at = last.end;
    let prefix = ",\n";
    if (source[at] === ",") {
      at += 1; // step past the existing comma
      prefix = "\n";
    }
    out = `${source.slice(0, at)}${prefix}${entry.replace(/\n$/, "")}${source.slice(at)}`;
  } else {
    // Empty object: insert between the braces.
    const openBrace =
      routesObject.getStart(sf) +
      source.slice(routesObject.getStart(sf)).indexOf("{") +
      1;
    out = `${source.slice(0, openBrace)}\n${entry}${source.slice(openBrace)}`;
  }

  // Insert the import after the last existing import (offsets in the original
  // source are still valid because the route entry was added later in the file).
  if (lastImportEnd !== undefined) {
    out =
      out.slice(0, lastImportEnd) +
      `\n${importLine.trimEnd()}` +
      out.slice(lastImportEnd);
  } else {
    out = importLine + out;
  }

  return out;
}

/**
 * Inverse of {@link insertRoute}: remove the route entry and its import.
 *
 * Used as the route generator's undo. Rather than restoring a stored copy of
 * the file, it deletes exactly the lines that {@link insertRoute} added — the
 * `routeKey` property in the `routes` object and the `import <pageName> ...`
 * line. Idempotent: returns the source unchanged if neither is present, and
 * leaves any other content (including manual edits) intact.
 */
export function removeRoute(
  source: string,
  ins: Pick<RouteInsertion, "pageName" | "routeKey">,
): string {
  const sf = ts.createSourceFile(
    "routes.ts",
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  let result = source;

  // 1. Remove the route entry (the property whose name === routeKey).
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (
        !ts.isIdentifier(decl.name) ||
        decl.name.text !== "routes" ||
        !decl.initializer
      ) {
        continue;
      }
      const obj = unwrapObjectLiteral(decl.initializer);
      if (!obj) continue;
      const prop = obj.properties.find(
        (p) =>
          p.name &&
          (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
          p.name.text === ins.routeKey,
      );
      if (prop) {
        result = removeFullLines(result, prop.getStart(sf), prop.end);
      }
    }
  }

  // 2. Remove the import line for the page component.
  // Re-parse because offsets shifted after the entry removal.
  const sf2 = ts.createSourceFile(
    "routes.ts",
    result,
    ts.ScriptTarget.Latest,
    true,
  );
  for (const stmt of sf2.statements) {
    if (
      ts.isImportDeclaration(stmt) &&
      stmt.importClause?.name?.text === ins.pageName &&
      // Only remove a pure default import (`import Page from "..."`), which is
      // exactly what insertRoute creates. If a user merged named bindings into
      // it (`import Page, { x } from "..."`), leave it — removing the whole line
      // would discard their bindings.
      !stmt.importClause.namedBindings
    ) {
      result = removeFullLines(result, stmt.getStart(sf2), stmt.end);
      break;
    }
  }

  return result;
}

/**
 * Remove the whole-line span covering [start, end), including the node's
 * leading indentation and its trailing newline, so no blank line is left behind.
 */
function removeFullLines(source: string, start: number, end: number): string {
  const lineStart = source.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = source.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = source.length;
  else lineEnd += 1; // include the newline
  return source.slice(0, lineStart) + source.slice(lineEnd);
}

/** Detect the indentation used by the first property of the object literal. */
function detectIndent(
  source: string,
  obj: ts.ObjectLiteralExpression,
): string | undefined {
  const first = obj.properties[0];
  if (!first) return undefined;
  const lineStart = source.lastIndexOf("\n", first.getStart()) + 1;
  const ws = source.slice(lineStart, first.getStart());
  return /^\s+$/.test(ws) ? ws : undefined;
}
