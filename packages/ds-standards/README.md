## Pragma Standards

This package contains [RDF Turtle](https://www.w3.org/TR/turtle/) files that establish standards for Pragma, following the ontology defined in the [ontology package](../ds-ontology/README.md).

Each standard in this package:
- Follows the CodeStandard ontology structure
- Provides clear prescriptive guidance
- Includes practical examples and anti-patterns
- Belongs to a specific domain of concerns

Standards are organized by domain in the [`src/`](./src/) directory, with each domain having its own `.ttl` file.

## Available Standards

### Styling Standards
The [`Styling.ttl`](./src/Styling.ttl) file contains standards for implementing the design system's visual language in CSS. These standards define:
- CSS variable usage and scoping
- Modifier system implementation
- Selector patterns and specificity
- Component styling architecture