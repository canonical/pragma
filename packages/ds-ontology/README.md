## Pragma Ontology

This package contains [RDF Turtle](https://www.w3.org/TR/turtle/) files that define the ontology used in Pragma.

Each file in [`src/`](./src/) corresponds to a specific namespace in the ontology. The files are organized as follows:

- [`CodeStandard.ttl`](./src/CodeStandard.ttl): Defines the `cs:` namespace, which includes classes and properties related to code standards.

### A note on schema URLs

The ontology files map ttl prefixes to schema URLs.

We do not currently have a hosting location for a schema, but we have chosen to use pragma.canonical.com for now, 
as it is a subdomain of a domain we control.

When we do have a hosting location, we will update the schema URLs accordingly. The prefix URLs should not be taken as permanent or authoritative yet.