## Pragma Standards

This package contains [RDF Turtle](https://www.w3.org/TR/turtle/) files that establish standards for Pragma, following the ontology defined in the [ontology package](../ds-ontology/README.md).

Each standard in this package:
- Follows the CodeStandard ontology structure
- Provides clear prescriptive guidance
- Includes practical examples and anti-patterns
- Belongs to a specific domain of concerns

Standards are organized by domain in the [`src/`](./src/) directory, with each domain having its own `.ttl` file.

## Available Standards

### Icon Standards
The [`Icons.ttl`](./src/Icons.ttl) file contains standards for creating and maintaining the design system's icon set. These standards ensure:
- Consistent SVG structure and naming
- Proper viewBox and scaling behavior
- Color inheritance and theming support
- TypeScript integration and type safety