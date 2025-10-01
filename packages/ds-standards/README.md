## Pragma Standards

This package contains [RDF Turtle](https://www.w3.org/TR/turtle/) files that establish standards for Pragma, following the ontology defined in the [ontology package](../ds-ontology/README.md).

Each standard in this package:
- Follows the CodeStandard ontology structure
- Provides clear prescriptive guidance
- Includes practical examples and anti-patterns
- Belongs to a specific domain of concerns

Standards are organized by domain in the [`src/`](./src/) directory, with each domain having its own `.ttl` file.

## Available Standards

### Code Standards
The [`Code.ttl`](./src/Code.ttl) file contains universal coding standards that apply across all programming contexts. These standards define fundamental practices for:
- Function organization and scope
- API stability documentation
- Code organization principles