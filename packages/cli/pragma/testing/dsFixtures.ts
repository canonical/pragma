/**
 * Design-system-specific TTL fixtures for testing shared operations.
 *
 * Richer than ke's generic fixtures — includes the full vocabulary
 * that D3 operations query against.
 */

// =============================================================================
// Ontology (TBox) — class and property definitions
// =============================================================================

export const DS_ONTOLOGY_TTL = `
@prefix ds: <https://ds.canonical.com/> .
@prefix cso: <http://pragma.canonical.com/codestandards#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# ---- Classes ----

ds:UIBlock a owl:Class ;
  rdfs:label "UI Block" .

ds:Component a owl:Class ;
  rdfs:subClassOf ds:UIBlock ;
  rdfs:label "Component" .

ds:Pattern a owl:Class ;
  rdfs:subClassOf ds:UIBlock ;
  rdfs:label "Pattern" .

ds:Tier a owl:Class ;
  rdfs:label "Tier" .

ds:ModifierFamily a owl:Class ;
  rdfs:label "Modifier Family" .

ds:Token a owl:Class ;
  rdfs:label "Design Token" .

ds:TokenType a owl:Class ;
  rdfs:label "Token Type" .

ds:ImplementationLibrary a owl:Class ;
  rdfs:label "Implementation Library" .

ds:ImplementationObject a owl:Class ;
  rdfs:label "Implementation Object" .

cso:CodeStandard a owl:Class ;
  rdfs:label "Code Standard" .

cso:Category a owl:Class ;
  rdfs:label "Standard Category" .

# ---- Properties ----

ds:name a owl:DatatypeProperty ;
  rdfs:domain ds:UIBlock ;
  rdfs:range xsd:string .

ds:tier a owl:ObjectProperty ;
  rdfs:domain ds:UIBlock .

ds:release a owl:ObjectProperty ;
  rdfs:domain ds:UIBlock .

ds:modifier a owl:ObjectProperty ;
  rdfs:domain ds:UIBlock ;
  rdfs:range ds:ModifierFamily .

ds:tierPath a owl:DatatypeProperty ;
  rdfs:domain ds:Tier ;
  rdfs:range xsd:string .

ds:parentTier a owl:ObjectProperty ;
  rdfs:domain ds:Tier ;
  rdfs:range ds:Tier .

ds:depth a owl:DatatypeProperty ;
  rdfs:domain ds:Tier ;
  rdfs:range xsd:integer .

ds:modifierName a owl:DatatypeProperty ;
  rdfs:domain ds:ModifierFamily ;
  rdfs:range xsd:string .

ds:hasValue a owl:DatatypeProperty ;
  rdfs:domain ds:ModifierFamily ;
  rdfs:range xsd:string .

ds:tokenId a owl:DatatypeProperty ;
  rdfs:domain ds:Token ;
  rdfs:range xsd:string .

ds:tokenType a owl:ObjectProperty ;
  rdfs:domain ds:Token ;
  rdfs:range ds:TokenType .

ds:tokenTier a owl:ObjectProperty ;
  rdfs:domain ds:Token .

ds:valueLight a owl:DatatypeProperty ;
  rdfs:domain ds:Token ;
  rdfs:range xsd:string .

ds:valueDark a owl:DatatypeProperty ;
  rdfs:domain ds:Token ;
  rdfs:range xsd:string .

ds:platform a owl:DatatypeProperty ;
  rdfs:domain ds:ImplementationLibrary ;
  rdfs:range xsd:string .

ds:libraryName a owl:DatatypeProperty ;
  rdfs:domain ds:ImplementationLibrary ;
  rdfs:range xsd:string .

ds:hasImplementation a owl:ObjectProperty ;
  rdfs:domain ds:ImplementationLibrary ;
  rdfs:range ds:ImplementationObject .

ds:implementsBlock a owl:ObjectProperty ;
  rdfs:domain ds:ImplementationObject ;
  rdfs:range ds:UIBlock .

ds:headLink a owl:DatatypeProperty ;
  rdfs:domain ds:ImplementationObject ;
  rdfs:range xsd:string .

ds:usesToken a owl:ObjectProperty ;
  rdfs:domain ds:UIBlock ;
  rdfs:range ds:Token .

cso:name a owl:DatatypeProperty ;
  rdfs:domain cso:CodeStandard ;
  rdfs:range xsd:string .

cso:category a owl:ObjectProperty ;
  rdfs:domain cso:CodeStandard ;
  rdfs:range cso:Category .

cso:categoryName a owl:DatatypeProperty ;
  rdfs:domain cso:Category ;
  rdfs:range xsd:string .

cso:description a owl:DatatypeProperty ;
  rdfs:domain cso:CodeStandard ;
  rdfs:range xsd:string .

cso:do a owl:DatatypeProperty ;
  rdfs:domain cso:CodeStandard ;
  rdfs:range xsd:string .

cso:dont a owl:DatatypeProperty ;
  rdfs:domain cso:CodeStandard ;
  rdfs:range xsd:string .

cso:extends a owl:ObjectProperty ;
  rdfs:domain cso:CodeStandard ;
  rdfs:range cso:CodeStandard .
`;

// =============================================================================
// Tier instances
// =============================================================================

export const DS_TIERS_TTL = `
@prefix ds: <https://ds.canonical.com/> .

ds:global a ds:Tier ;
  ds:tierPath "global" ;
  ds:depth 0 .

ds:apps a ds:Tier ;
  ds:tierPath "apps" ;
  ds:parentTier ds:global ;
  ds:depth 1 .

ds:apps_lxd a ds:Tier ;
  ds:tierPath "apps/lxd" ;
  ds:parentTier ds:apps ;
  ds:depth 2 .
`;

// =============================================================================
// Release channels
// =============================================================================

export const DS_RELEASES_TTL = `
@prefix ds: <https://ds.canonical.com/> .

ds:stable a ds:ReleaseChannel .
ds:experimental a ds:ReleaseChannel .
ds:alpha a ds:ReleaseChannel .
ds:beta a ds:ReleaseChannel .
`;

// =============================================================================
// Component instances
// =============================================================================

export const DS_COMPONENTS_TTL = `
@prefix ds: <https://ds.canonical.com/> .

ds:button a ds:Component ;
  ds:name "Button" ;
  ds:tier ds:global ;
  ds:release ds:stable ;
  ds:modifier ds:modifier_family.importance ;
  ds:modifier ds:modifier_family.density ;
  ds:usesToken ds:token.color.primary .

ds:card a ds:Component ;
  ds:name "Card" ;
  ds:tier ds:global ;
  ds:release ds:stable .

ds:lxd_panel a ds:Component ;
  ds:name "LXD Panel" ;
  ds:tier ds:apps_lxd ;
  ds:release ds:stable .

ds:beta_widget a ds:Component ;
  ds:name "Beta Widget" ;
  ds:tier ds:global ;
  ds:release ds:beta .
`;

// =============================================================================
// Implementation libraries and objects
// =============================================================================

export const DS_IMPLEMENTATIONS_TTL = `
@prefix ds: <https://ds.canonical.com/> .

ds:impl.react a ds:ImplementationLibrary ;
  ds:libraryName "@canonical/react-ds-global" ;
  ds:platform "react" ;
  ds:hasImplementation [
    a ds:ImplementationObject ;
    ds:implementsBlock ds:button ;
    ds:headLink "src/lib/Button/Button.tsx"
  ] , [
    a ds:ImplementationObject ;
    ds:implementsBlock ds:card ;
    ds:headLink "src/lib/Card/Card.tsx"
  ] .

ds:impl.svelte a ds:ImplementationLibrary ;
  ds:libraryName "@canonical/svelte-ds-global" ;
  ds:platform "svelte" .
`;

// =============================================================================
// Standards
// =============================================================================

export const DS_STANDARDS_TTL = `
@prefix cso: <http://pragma.canonical.com/codestandards#> .

cso:react_category a cso:Category ;
  cso:categoryName "react" .

cso:code_category a cso:Category ;
  cso:categoryName "code" .

cso:react_folder a cso:CodeStandard ;
  cso:name "react/component/folder-structure" ;
  cso:category cso:react_category ;
  cso:description "Components must follow the standard folder layout" ;
  cso:do "Place component files in src/lib/ComponentName/" ;
  cso:do "Include index.ts barrel export" ;
  cso:dont "Use flat directory with all components at same level" .

cso:react_props a cso:CodeStandard ;
  cso:name "react/component/props" ;
  cso:category cso:react_category ;
  cso:description "Props must extend the base HTML element type" ;
  cso:do "Extend HTMLAttributes<HTMLElement>" ;
  cso:dont "Define props without extending HTML attributes" .

cso:code_purity a cso:CodeStandard ;
  cso:name "code/function/purity" ;
  cso:category cso:code_category ;
  cso:description "Functions should be pure where possible" ;
  cso:do "Return same output for same input" ;
  cso:dont "Modify external state without annotation" .
`;

// =============================================================================
// Modifier families
// =============================================================================

export const DS_MODIFIERS_TTL = `
@prefix ds: <https://ds.canonical.com/> .

ds:modifier_family.importance a ds:ModifierFamily ;
  ds:modifierName "importance" ;
  ds:hasValue "default" ;
  ds:hasValue "primary" ;
  ds:hasValue "secondary" .

ds:modifier_family.density a ds:ModifierFamily ;
  ds:modifierName "density" ;
  ds:hasValue "default" ;
  ds:hasValue "compact" .
`;

// =============================================================================
// Tokens
// =============================================================================

export const DS_TOKENS_TTL = `
@prefix ds: <https://ds.canonical.com/> .

ds:token_type.color a ds:TokenType ;
  rdfs:label "Color" .

ds:token_type.dimension a ds:TokenType ;
  rdfs:label "Dimension" .

ds:token.color.primary a ds:Token ;
  ds:tokenId "color.primary" ;
  ds:tokenType ds:token_type.color ;
  ds:tokenTier ds:token_tier.semantic ;
  ds:valueLight "#0066cc" ;
  ds:valueDark "#4d9aff" .

ds:token.spacing.sm a ds:Token ;
  ds:tokenId "spacing.sm" ;
  ds:tokenType ds:token_type.dimension ;
  ds:tokenTier ds:token_tier.primitive ;
  ds:valueLight "8px" ;
  ds:valueDark "8px" .
`;

// =============================================================================
// Convenience: all fixtures concatenated
// =============================================================================

export const DS_ALL_TTL = [
  DS_ONTOLOGY_TTL,
  DS_TIERS_TTL,
  DS_RELEASES_TTL,
  DS_COMPONENTS_TTL,
  DS_IMPLEMENTATIONS_TTL,
  DS_STANDARDS_TTL,
  DS_MODIFIERS_TTL,
  DS_TOKENS_TTL,
].join("\n");
