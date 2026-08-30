---
name: add-standard
description: Create and add a new code standard to the code-standards package
---

# Add Standard

Create and add a new code standard to the code-standards package.

## When to Use

Use this skill when:
- "Add a standard for..."
- "Create a coding standard..."
- "Document a new convention..."
- "Add guidance for..."

## Workflow

### 1. Check for Existing Standards

Before creating a new standard, always check if one already exists:

```sparql
PREFIX cs: <http://pragma.canonical.com/codestandards#>

SELECT ?standard ?description WHERE {
  ?standard a cs:CodeStandard ;
            cs:description ?description .
  FILTER(CONTAINS(LCASE(STR(?standard)), "your-topic"))
}
```

Or use lookup:
```
sem_lookup(type: "cs:CodeStandard", filters: {"@id": {"$contains": "your-topic"}})
```

### 2. Determine the Category

List existing categories to find the right fit:

```sparql
PREFIX cs: <http://pragma.canonical.com/codestandards#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?category ?label ?slug WHERE {
  ?category a cs:Category ;
            rdfs:label ?label ;
            cs:slug ?slug .
}
```

**Available Categories:**

| Category | Slug | Description |
|----------|------|-------------|
| React | `react` | React component development |
| CSS | `css` | CSS technical implementation |
| Styling | `styling` | Design system styling patterns |
| Code | `code` | General TypeScript standards |
| Storybook | `storybook` | Storybook documentation |
| Icons | `icons` | Icon implementation |
| Packaging | `packaging` | Package structure and exports |
| Rust | `rust` | Idiomatic Rust development |
| Git | `git` | Git workflow conventions |
| TSDoc | `tsdoc` | Documentation conventions |
| Turtle | `turtle` | RDF/Turtle authoring |
| UI Blocks | `ui-blocks` | Framework-agnostic capabilities and patterns for UI blocks |

If no existing category fits, create a new one (see Section 5).

### 3. Design the Standard Identifier

Standard identifiers follow a hierarchical compact IRI pattern: `cs:{category}.{domain}.{topic}`

**Pattern:** `^cs:[a-z]+(\.[a-z0-9_]+){2,}$`

**Examples:**
- `cs:react.component.structure.folder`
- `cs:css.selectors.namespace`
- `cs:styling.tokens.creation`
- `cs:react.hooks.naming`

**Guidelines:**
- Use lowercase with underscores for multi-word segments
- Category is always the first segment after `cs:`
- Be specific but not overly verbose
- Follow existing naming patterns in the same category
- Treat the subject IRI as the only canonical identifier
- Use `cs:name` only for an optional human-readable display title

### 4. Write the Standard

Create a new standard instance in the appropriate data file under `data/`.

**Template:**

```turtle
cs:category.domain.topic a cs:CodeStandard ;
    cs:name "Human Readable Title" ;
    cs:hasCategory cs:category ;
    cs:description "Clear, concise description of what this standard covers and why it matters." ;
    cs:do [
        cs:description "First recommended practice." ;
        cs:language "typescript" ;
        cs:code """
// Example showing the correct approach
const good = true;
    """
    ] ;
    cs:do [
        cs:description "Second recommended practice." ;
        cs:language "typescript" ;
        cs:code """
// Another correct example
const alsoGood = true;
    """
    ] ;
    cs:dont [
        cs:description "First anti-pattern to avoid." ;
        cs:language "typescript" ;
        cs:code """
// Example showing what NOT to do
const bad = true;
    """
    ] ;
    cs:dont [
        cs:description "Second anti-pattern." ;
        cs:language "typescript" ;
        cs:code """
// Another bad example
const alsoBad = true;
    """
    ] .
```

Each `cs:do` and `cs:dont` is a blank node (`cs:Example`) with structured fields:
- `cs:description` — What the example demonstrates (required)
- `cs:language` — Language of the code block, e.g. `"typescript"`, `"rust"`, `"css"`, `"bash"`, `"svg"` (optional, omit when no code)
- `cs:code` — The code content (optional, omit for description-only examples)

**Required Properties:**
- subject IRI - Canonical compact identifier
- `cs:hasCategory` - Reference to a Category instance
- `cs:description` - What and why (plain text or markdown)
- `cs:do` - One or more positive examples (blank nodes)
- `cs:dont` - One or more negative examples (blank nodes)

**Optional Properties:**
- `cs:name` - Human-readable display title
- `cs:extends` - Reference to a parent standard this builds upon

### 5. Create a New Category (if needed)

If your standard doesn't fit existing categories:

```turtle
cs:new_category a cs:Category ;
    rdfs:label "Category Name"@en ;
    rdfs:comment "Description of what this category covers"@en ;
    cs:slug "slug-name" .
```

### 6. Extending Existing Standards

When your standard builds on another:

```turtle
cs:react.component.props.special_case a cs:CodeStandard ;
    cs:name "React Props Special Case" ;
    cs:extends cs:react.component.props ;
    cs:hasCategory cs:react ;
    cs:description "Specific guidance that builds on the general props standard." ;
    cs:do [
        cs:description "Example of the specific pattern." ;
        cs:language "typescript" ;
        cs:code """
// ...
    """
    ] ;
    cs:dont [
        cs:description "Anti-pattern to avoid." ;
        cs:language "typescript" ;
        cs:code """
// ...
    """
    ] .
```

Query to find potential parent standards:
```sparql
PREFIX cs: <http://pragma.canonical.com/codestandards#>

SELECT ?standard WHERE {
  ?standard a cs:CodeStandard .
  FILTER(STRSTARTS(STR(?standard), STR(cs:react.component.props)))
}
```

### 7. Validate Before Committing

After writing the standard, validate the Turtle syntax:

```bash
sem check code-standards
```

Then verify the standard loads correctly:
```
sem_lookup(type: "cs:CodeStandard", filters: {"@id": "cs:category.domain.topic"})
```

The `@id` must always use the canonical compact IRI. Do not look up standards by `cs:name`.

## File Organization

Standards are organized by category in `data/`:

```
code-standards/
├── definitions/
│   └── CodeStandard.ttl    # Ontology schema
├── data/
│   ├── react.ttl           # React standards
│   ├── css.ttl             # CSS standards
│   ├── styling.ttl         # Styling standards
│   ├── code.ttl            # General code standards
│   ├── storybook.ttl       # Storybook standards
│   └── icons.ttl           # Icon standards
└── skills/
    └── standards-guide/
        └── SKILL.md
```

Add new standards to the file matching their category.

## Writing Quality Standards

### Description Guidelines
- Start with WHAT the standard covers
- Explain WHY it matters
- Keep it concise but complete
- Use markdown for complex descriptions

### Do Examples Guidelines
- Each `cs:do` blank node is one discrete positive example
- `cs:description` explains what the example demonstrates
- `cs:language` must match the code block language (e.g. `"typescript"`, `"css"`, `"rust"`)
- `cs:code` contains the actual code — no markdown fences needed
- Provide concrete, runnable examples
- Show the COMPLETE correct pattern

### Don't Examples Guidelines
- Each `cs:dont` blank node is one discrete negative example
- Show realistic mistakes developers make
- `cs:description` should explain WHY it's problematic
- Mirror the structure of the do examples where possible

### Example Quality Checklist
- [ ] Examples are syntactically correct
- [ ] Examples are self-contained (can be understood without context)
- [ ] Examples use realistic code, not `foo`/`bar`
- [ ] Examples include comments explaining key points
- [ ] Both do's and don'ts cover the same scenarios

## Complete Example

Adding a new standard for React error boundaries:

```turtle
# In data/react.ttl

cs:react.component.error_boundaries a cs:CodeStandard ;
    cs:name "React Error Boundaries" ;
    cs:hasCategory cs:react ;
    cs:description "Error boundaries must be used to catch JavaScript errors in component trees and display fallback UI. They should be placed strategically to isolate failures without breaking the entire application." ;
    cs:do [
        cs:description "Wrap feature sections with error boundaries to isolate failures." ;
        cs:language "tsx" ;
        cs:code """
const Dashboard = () => (
  <div className="ds dashboard">
    <ErrorBoundary fallback={<WidgetError />}>
      <AnalyticsWidget />
    </ErrorBoundary>
    <ErrorBoundary fallback={<WidgetError />}>
      <ActivityWidget />
    </ErrorBoundary>
  </div>
);
    """
    ] ;
    cs:do [
        cs:description "Provide meaningful fallback UI that helps users understand and recover." ;
        cs:language "tsx" ;
        cs:code """
const WidgetError = () => (
  <div className="ds widget-error">
    <p>This section couldn't load.</p>
    <button onClick={() => window.location.reload()}>
      Refresh page
    </button>
  </div>
);
    """
    ] ;
    cs:dont [
        cs:description "Wrap the entire application in a single error boundary." ;
        cs:language "tsx" ;
        cs:code """
// Bad: One error anywhere crashes everything
const App = () => (
  <ErrorBoundary>
    <Header />
    <Main />
    <Footer />
  </ErrorBoundary>
);
    """
    ] ;
    cs:dont [
        cs:description "Use generic or unhelpful fallback messages." ;
        cs:language "tsx" ;
        cs:code """
// Bad: Doesn't help the user
const fallback = <div>Something went wrong</div>;
    """
    ] .
```

## Tips

1. **Check before creating**: Always search for existing standards first - you might need to extend rather than create new
2. **Follow patterns**: Look at existing standards in the same category for style guidance
3. **Be specific**: Vague standards are hard to follow - include concrete examples
4. **Test your examples**: Make sure code examples actually work
5. **Consider hierarchy**: Use `cs:extends` when your standard builds on another
