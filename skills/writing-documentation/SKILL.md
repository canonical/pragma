# Writing Documentation

A comprehensive methodology for writing technical documentation in the Pragma monorepo. This skill captures the complete process from planning through implementation, including artifact tracking, prose style, and quality standards.

## Description

This skill guides the creation of technical documentation that serves developers effectively. It covers three interconnected concerns: planning documentation through artifact modeling, tracking authorship through transition sidecars, and writing prose that communicates clearly without padding or fragments.

The methodology emerged from practical work on the Pragma design system monorepo. It combines Diataxis quadrant thinking for document classification with semantic artifact tracking for project management.

## When to Use

Use this skill when:
- Planning documentation for a new codebase or major feature
- Writing technical prose (README files, guides, references)
- Creating artifact definitions to track documentation work
- Recording authorship transitions for compliance or audit trails
- Reviewing documentation for tone and quality

## Discovery Flow

Before writing documentation, contextualize yourself with the semantic packages:

```
sem_readme("artifact")     # Understand artifact kinds, states, composition
sem_readme("transitions")  # Understand event types and tracking
sem_readme("diataxis")     # Understand documentation quadrants
```

Then query existing artifacts to understand the current state:

```sparql
PREFIX artifact: <http://artifact.example.org/ontology#>

SELECT ?artifact ?title ?state WHERE {
    ?artifact a artifact:Artifact ;
              artifact:title ?title ;
              artifact:state ?state .
}
ORDER BY ?state ?title
```

## Part I: Documentation Planning

### The Artifact Approach

Documentation planning begins with artifact definitions. An artifact is a semantic description of a document that will exist. It captures the document's purpose, structure, and relationships before any prose is written.

Artifacts serve two purposes. First, they force clarity about what each document should contain and why it exists. Second, they create a traceable record of documentation work that can be queried and analyzed.

### Artifact Structure

Every artifact definition follows a consistent structure using RDF/Turtle syntax. The structure includes identity, classification, state, and features.

```turtle
@prefix pragma:    <http://pragma.canonical.com/docs#> .
@prefix artifact:  <http://artifact.example.org/ontology#> .
@prefix diataxis:  <http://diataxis.example.org/ontology#> .
@prefix rdfs:      <http://www.w3.org/2000/01/rdf-schema#> .

pragma:doc.example a artifact:Artifact ;
    artifact:kind artifact:Documentation ;
    artifact:title "Example Documentation" ;
    artifact:version "0.1.0" ;
    artifact:state artifact:Draft ;
    artifact:description """
Brief description of what this document covers and why it exists.
""" ;
    artifact:hasFeature pragma:doc.example.section-one ;
    artifact:hasFeature pragma:doc.example.section-two .
```

### Artifact Kinds

The artifact ontology defines seven fundamental kinds. For documentation work, three are most relevant:

| Kind | Purpose | Example |
|------|---------|---------|
| `artifact:Specification` | Defines how something works | README, component anatomy |
| `artifact:Documentation` | Explanatory content for humans | Guides, tutorials |
| `artifact:Foundation` | Foundational assumptions | Philosophy documents |

Other kinds (`Code`, `Design`, `Audit`, `Resource`, `Strategy`) apply to non-documentation artifacts.

### Artifact States

Artifacts progress through seven lifecycle states:

| State | Order | Description |
|-------|-------|-------------|
| `artifact:Deferred` | 0 | Intentionally postponed |
| `artifact:Sketch` | 1 | Exploratory, incomplete |
| `artifact:Draft` | 2 | Substantially complete |
| `artifact:Review` | 3 | Submitted for evaluation |
| `artifact:Accepted` | 4 | Approved and ready |
| `artifact:Deprecated` | 5 | Superseded but available |
| `artifact:Archived` | 6 | No longer maintained |

For documentation, a common progression is Draft → Accepted (plan approved) → then implementation happens outside the artifact (the actual .md file is written). However, artifacts are not limited to a single pass through these states. An accepted document may return to Review when significant changes are proposed, then back to Accepted after approval. Multiple review cycles are normal and expected for evolving documentation.

### Features as Sections

Features represent planned sections within a document. Each feature declares its Diataxis quadrant, which guides the writing style for that section. Features can nest arbitrarily deep to model document structure.

```turtle
pragma:doc.example.section-one a artifact:Feature ;
    artifact:featureOf pragma:doc.example ;
    artifact:featureOrder 1 ;
    rdfs:label "Section Title" ;
    diataxis:inQuadrant diataxis:explanation ;
    artifact:content """Outline of what this section covers.""" ;
    # Nested subsections use blank nodes - no need for global identifiers
    artifact:hasFeature [
        a artifact:Feature ;
        artifact:featureOrder 1 ;
        rdfs:label "First Subsection" ;
        diataxis:inQuadrant diataxis:reference
    ] ;
    artifact:hasFeature [
        a artifact:Feature ;
        artifact:featureOrder 2 ;
        rdfs:label "Second Subsection" ;
        diataxis:inQuadrant diataxis:howto
    ] .
```

Nested sections are modeled as blank nodes because they exist only in the context of their parent section. This keeps the namespace clean and reflects the structural dependency: subsections cannot be meaningfully referenced without their containing section.

The four Diataxis quadrants serve different purposes:

| Quadrant | Purpose | Characteristics |
|----------|---------|-----------------|
| `diataxis:tutorial` | Learning-oriented | Step-by-step, safe environment, single path |
| `diataxis:howto` | Task-oriented | Practical steps, assumes competence, flexible |
| `diataxis:reference` | Information-oriented | Factual, scannable, complete within scope |
| `diataxis:explanation` | Understanding-oriented | Contextual, discursive, answers "why" |

### SPARQL: Query Artifacts by State

Find all draft artifacts that need implementation:

```sparql
PREFIX artifact: <http://artifact.example.org/ontology#>

SELECT ?artifact ?title ?kind WHERE {
    ?artifact a artifact:Artifact ;
              artifact:state artifact:Draft ;
              artifact:title ?title ;
              artifact:kind ?kind .
}
```

### SPARQL: Query Features for an Artifact

Get all features of an artifact with their Diataxis quadrants:

```sparql
PREFIX artifact: <http://artifact.example.org/ontology#>
PREFIX diataxis: <http://diataxis.example.org/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?feature ?label ?quadrant ?order WHERE {
    ?feature artifact:featureOf <pragma:doc.example> ;
             rdfs:label ?label .
    OPTIONAL { ?feature diataxis:inQuadrant ?quadrant }
    OPTIONAL { ?feature artifact:featureOrder ?order }
}
ORDER BY ?order
```

## Part II: Transition Tracking

### Purpose of Transitions

Transitions record authoring events as first-class entities. Each transition captures who did what, when, and why. This creates an audit trail that serves compliance requirements and enables understanding of how documentation evolved.

The transitions ontology is independent and has no dependencies. It can be used standalone or composed with artifacts. The core philosophy is **event reification**: state changes are entities with rich attribution (who, what, when, why), and the authoritative history is the event log.

### The Sidecar Pattern

Transitions are stored in sidecar files alongside artifacts:

```
session/artifacts/
├── spec.readme-monorepo.ttl              # Structural: the artifact itself
├── spec.readme-monorepo.transitions.ttl  # Temporal: events that happened to it
├── guide.versioning.ttl
└── guide.versioning.transitions.ttl
```

This separation keeps structural definitions clean while enabling rich temporal tracking.

### Event Types

The transitions ontology defines six event types for different lifecycle activities:

| Event Type | Description | Key Properties |
|------------|-------------|----------------|
| `transition:AuthoringEvent` | Content creation/modification | `declaredState`, `declaredAIInvolvement` |
| `transition:ReviewEvent` | Quality evaluation | `reviewOutcome`, `reviewComments` |
| `transition:ApprovalEvent` | State promotion | `promotesTo`, `approvalAuthority` |
| `transition:AuditingEvent` | Metadata inference | `inferredState`, `confidence`, `inferenceMethod` |
| `transition:AdoptionEvent` | External resource adoption | `adoptedFrom`, `adoptionRationale` |
| `transition:SupersessionEvent` | Resource replacement | `supersededBy`, `supersessionRationale` |

For documentation work, `AuthoringEvent` is used most frequently. `ReviewEvent` and `ApprovalEvent` apply when formal review processes exist.

### AuthoringEvent Structure

The most common transition type for documentation:

```turtle
@prefix pragma:     <http://pragma.canonical.com/docs#> .
@prefix artifact:   <http://artifact.example.org/ontology#> .
@prefix transition: <http://transitions.example.org/ontology#> .
@prefix xsd:        <http://www.w3.org/2001/XMLSchema#> .
@prefix foaf:       <http://xmlns.com/foaf/0.1/> .

[ a transition:AuthoringEvent ;
    transition:describes pragma:doc.example ;
    transition:agent [ a foaf:Agent ; foaf:name "Adrian" ] ;
    transition:timestamp "2026-01-20T14:30:00Z"^^xsd:dateTime ;
    transition:declaredState artifact:Draft ;
    transition:declaredAIInvolvement transition:CocreationHumanLed ;
    transition:note """Initial artifact definition for example documentation.
Covers installation, configuration, and usage patterns.
Based on analysis of existing codebase structure."""
] .
```

### AI Involvement Levels

When AI assists with documentation, declare the involvement level honestly:

| Level | Meaning | When to Use |
|-------|---------|-------------|
| `transition:Human` | No AI involvement | Pure human authorship |
| `transition:CocreationHumanLed` | Human directs, AI assists | Human defines scope, AI helps draft |
| `transition:CocreationAILed` | AI generates, human refines | AI proposes, human edits and approves |
| `transition:FullAI` | AI generates without modification | Automated generation accepted as-is |

Most documentation work falls under `CocreationHumanLed`: a human defines what to write and reviews results, while AI assists with research and drafting.

### ReviewEvent Structure

When documentation undergoes formal review:

```turtle
[ a transition:ReviewEvent ;
    transition:describes pragma:doc.example ;
    transition:agent [ a foaf:Agent ; foaf:name "Reviewer" ] ;
    transition:timestamp "2026-01-21T10:00:00Z"^^xsd:dateTime ;
    transition:reviewOutcome transition:RevisionRequested ;
    transition:reviewComments """Good structure but needs more concrete examples.
The installation section assumes too much prior knowledge.
Add troubleshooting section for common errors."""
] .
```

Review outcomes are:
- `transition:Approved` - Meets requirements
- `transition:Rejected` - Requires significant rework
- `transition:RevisionRequested` - Specific changes needed

### ApprovalEvent Structure

When documentation is formally approved:

```turtle
[ a transition:ApprovalEvent ;
    transition:describes pragma:doc.example ;
    transition:agent [ a foaf:Agent ; foaf:name "Tech Lead" ] ;
    transition:timestamp "2026-01-22T09:00:00Z"^^xsd:dateTime ;
    transition:promotesTo artifact:Accepted ;
    transition:approvalAuthority "Documentation Lead"
] .
```

### Blank Node Policy

Transitions are events without stable identity. Blank nodes are explicitly permitted and encouraged:

```turtle
# Valid: blank node for transition event
[ a transition:AuthoringEvent ;
    transition:describes :MyDoc ;
    transition:timestamp "2026-01-20"^^xsd:date ;
    transition:note "Initial draft"
] .
```

Identity is derived from context (containing file, timestamp, describes relation).

### When to Record Transitions

Create a transition record when:
- Creating a new artifact definition (AuthoringEvent with initial state)
- Moving an artifact to a new state (AuthoringEvent with new state)
- Making significant revisions to content (AuthoringEvent noting changes)
- Receiving feedback (ReviewEvent with outcome and comments)
- Formally approving documentation (ApprovalEvent with authority)
- Changing authorship or involvement levels (AuthoringEvent noting change)

The note field should explain what changed and why. Future readers use these notes to understand the document's evolution.

### SPARQL: Query Event History

Find all transitions for an artifact, ordered chronologically:

```sparql
PREFIX transition: <http://transitions.example.org/ontology#>

SELECT ?event ?type ?timestamp ?agent ?note WHERE {
    ?event transition:describes <pragma:doc.example> ;
           a ?type ;
           transition:timestamp ?timestamp .
    OPTIONAL {
        ?event transition:agent ?agentNode .
        ?agentNode foaf:name ?agent
    }
    OPTIONAL { ?event transition:note ?note }
    FILTER(?type != transition:Transition)
}
ORDER BY ?timestamp
```

### SPARQL: Find All AI-Assisted Content

Identify documentation with AI involvement:

```sparql
PREFIX transition: <http://transitions.example.org/ontology#>
PREFIX artifact: <http://artifact.example.org/ontology#>

SELECT ?artifact ?title ?aiLevel ?timestamp WHERE {
    ?event a transition:AuthoringEvent ;
           transition:describes ?artifact ;
           transition:declaredAIInvolvement ?aiLevel ;
           transition:timestamp ?timestamp .
    ?artifact artifact:title ?title .
    FILTER(?aiLevel != transition:Human)
}
ORDER BY ?timestamp
```

### SPARQL: Find Artifacts Needing Review

Find artifacts that have been authored but not yet reviewed:

```sparql
PREFIX transition: <http://transitions.example.org/ontology#>
PREFIX artifact: <http://artifact.example.org/ontology#>

SELECT ?artifact ?title WHERE {
    ?artifact a artifact:Artifact ;
              artifact:title ?title .
    ?authorEvent a transition:AuthoringEvent ;
                 transition:describes ?artifact .
    FILTER NOT EXISTS {
        ?reviewEvent a transition:ReviewEvent ;
                     transition:describes ?artifact .
    }
}
```

### Complete Transition Sidecar Example

A full transitions file showing artifact evolution:

```turtle
@prefix pragma:     <http://pragma.canonical.com/docs#> .
@prefix artifact:   <http://artifact.example.org/ontology#> .
@prefix transition: <http://transitions.example.org/ontology#> .
@prefix xsd:        <http://www.w3.org/2001/XMLSchema#> .
@prefix foaf:       <http://xmlns.com/foaf/0.1/> .

# ==============================================================================
# TRANSITIONS: spec.readme-monorepo.ttl
# ==============================================================================

# Initial planning
[ a transition:AuthoringEvent ;
    transition:describes pragma:doc.readme ;
    transition:agent [ a foaf:Agent ; foaf:name "Adrian" ] ;
    transition:timestamp "2026-01-19T10:00:00Z"^^xsd:dateTime ;
    transition:declaredState artifact:Draft ;
    transition:declaredAIInvolvement transition:Human ;
    transition:note """Initial artifact definition for monorepo README.
Planned sections: Quick Start, Prerequisites, Repository Structure,
Component Tiers, Styles Architecture, Development Workflow, CI/CD."""
] .

# First implementation attempt
[ a transition:AuthoringEvent ;
    transition:describes pragma:doc.readme ;
    transition:agent [ a foaf:Agent ; foaf:name "Claude" ] ;
    transition:timestamp "2026-01-19T14:00:00Z"^^xsd:dateTime ;
    transition:declaredState artifact:Draft ;
    transition:declaredAIInvolvement transition:CocreationHumanLed ;
    transition:note """First draft of README.md.
Used bullet fragments - needs rewrite with full sentences."""
] .

# Review feedback
[ a transition:ReviewEvent ;
    transition:describes pragma:doc.readme ;
    transition:agent [ a foaf:Agent ; foaf:name "Adrian" ] ;
    transition:timestamp "2026-01-19T15:00:00Z"^^xsd:dateTime ;
    transition:reviewOutcome transition:RevisionRequested ;
    transition:reviewComments """Style is too lightweight. Need:
- Full sentences instead of bullet fragments
- Proper paragraph structure with intro/body/outro
- Technical depth explaining 'why' not just 'what'
- Package reference table"""
] .

# Revision after feedback
[ a transition:AuthoringEvent ;
    transition:describes pragma:doc.readme ;
    transition:agent [ a foaf:Agent ; foaf:name "Claude" ] ;
    transition:timestamp "2026-01-19T18:00:00Z"^^xsd:dateTime ;
    transition:declaredState artifact:Accepted ;
    transition:declaredAIInvolvement transition:CocreationHumanLed ;
    transition:note """Complete rewrite with full prose.
Added Package Reference table with all 25 packages.
Explained pure CSS decision, Yeoman generator, component tiers.
Matches established tone from philosophy.md."""
] .

# Final approval
[ a transition:ApprovalEvent ;
    transition:describes pragma:doc.readme ;
    transition:agent [ a foaf:Agent ; foaf:name "Adrian" ] ;
    transition:timestamp "2026-01-19T19:00:00Z"^^xsd:dateTime ;
    transition:promotesTo artifact:Accepted ;
    transition:approvalAuthority "Project Lead"
] .
```

## Part III: Writing Style

### The Core Principle

Every paragraph needs substance. Avoid bullet fragments, avoid placeholder sentences, avoid padding. Each paragraph should have an introduction that sets context, a body that delivers content, and a conclusion that connects to what follows.

The reader is a developer who needs information quickly but completely. Respect their time by being direct. Respect their intelligence by providing depth.

### Full Sentences Always

Never use bullet fragments where sentences belong. Compare these approaches:

**Wrong (fragments):**
- Fast installation
- TypeScript support
- Works with React

**Right (sentences):**
Installation completes in under thirty seconds because the package has minimal dependencies. TypeScript definitions ship with the package, eliminating the need for separate @types installations. The component library integrates with React through standard JSX patterns.

Bullet lists remain appropriate for genuinely list-like content: feature enumerations, command options, file listings. The test is whether each item is a complete thought or a fragment requiring context.

### Paragraph Structure

Each paragraph serves one purpose. The first sentence introduces that purpose. The middle sentences develop it with specifics. The final sentence either concludes the point or bridges to the next paragraph.

Consider this example from the Pragma README:

> The CSS architecture uses layered packages rather than a monolithic stylesheet. **@canonical/styles** is the aggregator package that imports all style layers in the correct order. Applications typically import only this package.

The first sentence states the architectural decision. The second sentence identifies the key package. The third sentence explains what consumers should do. Each sentence advances the paragraph's purpose without redundancy.

### Technical Depth

Documentation should explain not just what but why. Technical decisions have reasons. Share those reasons.

When describing the choice to use pure CSS without preprocessors:

> Pragma uses pure CSS with no preprocessors, no CSS-in-JS, and no build-time transformations beyond standard bundling. The stylesheets you write are the stylesheets that ship. This decision keeps the styling system understandable to anyone who knows CSS, eliminates runtime overhead from style injection, and ensures styles work correctly during server-side rendering without hydration concerns.

The first two sentences state the fact. The third sentence explains the reasoning. Readers understand both what the project does and why it does it that way.

### Concrete Examples

Abstract descriptions become clear through concrete examples. When explaining a pattern, show it in actual code from the codebase.

> Props interfaces extend the appropriate HTML attributes interface (e.g., `ButtonHTMLAttributes<HTMLButtonElement>`) to ensure all native attributes pass through correctly.

The parenthetical example transforms the abstract "appropriate HTML attributes interface" into a concrete type name developers can recognize and search for.

### Contextualizing Before Writing

Before writing any document, read related existing documentation to internalize the established tone. Read the codebase to understand what you're documenting. Surface actual patterns, actual file names, actual type definitions.

Use sem tools to gather context efficiently:

```
sem_sample("artifact:Artifact")     # See actual artifact examples
sem_lookup(type="artifact:Feature") # Find existing feature patterns
sem_sparql(query="...")             # Query for specific relationships
```

This contextualization prevents documentation that contradicts the code or misrepresents how things work. It also ensures consistency across documents written at different times.

### Headings and Structure

Use descriptive headings that help readers navigate. Headings should work as a table of contents: reading only the headings should convey the document's scope.

For philosophical or principle-based documents, Roman numerals create appropriate gravitas:

> ## I. No Magic
> ## II. Explicit Conventions
> ## III. DRY Only for Stable Patterns

For procedural or technical documents, descriptive headings work better:

> ## Commit Message Format
> ## Release Process
> ## Troubleshooting

Match the heading style to the document's character.

### Tables for Reference Material

When documenting packages, options, or other enumerable items, tables provide scannable reference:

| Package | Path | Description |
|---------|------|-------------|
| `@canonical/react-ds-global` | `packages/react/ds-global` | Global tier components |
| `@canonical/utils` | `packages/utils` | Utility functions |

Tables work because they align related information spatially. The reader's eye can scan down the Name column to find a package, then across to see its path and description.

### Code Blocks

Code examples should be complete enough to understand, minimal enough to focus on the point. Include language hints for syntax highlighting.

When showing a component pattern:

```typescript
const Button = ({
  className, appearance, children, ...props
}: Props): React.ReactElement => {
  return (
    <button
      className={["ds", "button", appearance, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
};
```

This example shows enough to understand the className assembly pattern without including every prop or every line from the real component.

## Part IV: Quality Checklist

Before considering documentation complete, verify:

### Planning Quality
- [ ] Artifact definition exists with appropriate kind
- [ ] All sections defined as features with Diataxis quadrants
- [ ] Transitions recorded for all state changes
- [ ] Version numbers updated appropriately

### Prose Quality
- [ ] No bullet fragments where sentences belong
- [ ] Every paragraph has introduction, body, conclusion
- [ ] Technical decisions include rationale
- [ ] Abstract concepts have concrete examples
- [ ] Code examples are complete and correct

### Accuracy
- [ ] File paths verified against actual filesystem
- [ ] Package names match package.json
- [ ] Type names match TypeScript definitions
- [ ] Commands tested and working
- [ ] Version numbers current

### Tone Consistency
- [ ] Matches established tone from other documents
- [ ] Technical but not condescending
- [ ] Direct but not terse
- [ ] Explains "why" alongside "what"

## Part V: Practical Workflow

### Starting a Documentation Project

1. Survey the codebase to understand what exists
2. Query existing artifacts: `sem_lookup(type="artifact:Artifact")`
3. List all documents that should exist
4. Create artifact definitions for each document
5. Create transition records noting the planning phase
6. Review the plan for completeness and coherence

### Writing a Document

1. Read related existing documentation for tone
2. Read relevant source code for accuracy
3. Query for context: `sem_sample`, `sem_describe`, `sem_sparql`
4. Write the document following style guidelines
5. Update the artifact state to Accepted
6. Record a transition noting the implementation

### Reviewing Documentation

1. Query artifact coverage: which docs lack artifacts?
2. Query state accuracy: do states reflect reality?
3. Check prose quality against the checklist
4. Check factual accuracy against the codebase
5. Record review transitions with feedback

### SPARQL: Documentation Coverage Report

Find which planned documents are implemented vs pending:

```sparql
PREFIX artifact: <http://artifact.example.org/ontology#>

SELECT ?artifact ?title ?state ?kind WHERE {
    ?artifact a artifact:Artifact ;
              artifact:kind ?kind ;
              artifact:state ?state ;
              artifact:title ?title .
    FILTER(?kind IN (artifact:Documentation, artifact:Specification, artifact:Foundation))
}
ORDER BY ?state ?title
```

## Example: Complete Artifact Lifecycle

### Phase 1: Planning

Create the artifact definition:

```turtle
pragma:doc.versioning a artifact:Artifact ;
    artifact:kind artifact:Documentation ;
    artifact:title "Versioning and Conventional Commits" ;
    artifact:version "0.1.0" ;
    artifact:state artifact:Draft ;
    artifact:description """
Explains commit conventions, version strategy, and release process.
Covers conventional commits format, Lerna versioning, and pre-release types.
""" ;
    artifact:hasFeature pragma:doc.versioning.commit-format ;
    artifact:hasFeature pragma:doc.versioning.release-process .

pragma:doc.versioning.commit-format a artifact:Feature ;
    artifact:featureOf pragma:doc.versioning ;
    artifact:featureOrder 1 ;
    rdfs:label "Commit Message Format" ;
    diataxis:inQuadrant diataxis:reference .

pragma:doc.versioning.release-process a artifact:Feature ;
    artifact:featureOf pragma:doc.versioning ;
    artifact:featureOrder 2 ;
    rdfs:label "Release Process" ;
    diataxis:inQuadrant diataxis:howto .
```

Record the planning transition:

```turtle
[ a transition:AuthoringEvent ;
    transition:describes pragma:doc.versioning ;
    transition:agent [ a foaf:Agent ; foaf:name "Adrian" ] ;
    transition:timestamp "2026-01-20T00:00:00Z"^^xsd:dateTime ;
    transition:declaredState artifact:Draft ;
    transition:declaredAIInvolvement transition:Human ;
    transition:note """Initial artifact definition for versioning guide.
Based on analysis of .github/workflows/tag.yml and git history."""
] .
```

### Phase 2: Implementation

Write the document following style guidelines. Then update the artifact:

```turtle
pragma:doc.versioning a artifact:Artifact ;
    artifact:version "1.0.0" ;
    artifact:state artifact:Accepted .
```

Record the implementation transition:

```turtle
[ a transition:AuthoringEvent ;
    transition:describes pragma:doc.versioning ;
    transition:agent [ a foaf:Agent ; foaf:name "Claude" ] ;
    transition:timestamp "2026-01-20T12:00:00Z"^^xsd:dateTime ;
    transition:declaredState artifact:Accepted ;
    transition:declaredAIInvolvement transition:CocreationHumanLed ;
    transition:note """docs/versioning.md implemented with full prose.
Sections: Commit Message Format, Commit Types, Scopes, Breaking Changes,
Version Strategy, Release Process, Pre-release Types.
Includes real examples from git history."""
] .
```

## Trust Model

The transitions ontology assumes trustworthy, non-adversarial agents. AI involvement declarations are self-reported metadata with no cryptographic verification. This design is appropriate for internal tooling and cooperative workflows where the goal is transparency and documentation, not enforcement.

For adversarial or compliance-critical contexts, consider adding:
- Signed transition events with agent credentials
- Append-only immutable logs
- External attestation services
- Hash chains linking events

The transitions ontology provides semantic structure for provenance. Trust infrastructure layers on top when needed.

## Related Resources

- Diataxis framework: https://diataxis.fr
- Artifact ontology: `sem_readme("artifact")`
- Transitions ontology: `sem_readme("transitions")`
- Diataxis ontology: `sem_readme("diataxis")`
- Pragma documentation: `docs/`
- Artifact definitions: `session/artifacts/`

## Related Skills

- **component-from-ontology**: Generate component implementations from design system ontology. Use after documenting component specifications to create DSL-compliant implementations.
- **anatomy-author** (design-system): Create anatomy DSL specifications for components. Use before this skill when documenting new component structures.
- **component-specifier** (design-system): Specify component metadata (tier, modifiers, usage guidance). Use alongside documentation artifacts.
