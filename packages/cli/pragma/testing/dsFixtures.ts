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
@prefix ds: <https://ds.canonical.com/data/> .
@prefix dso: <https://ds.canonical.com/ontology#> .
@prefix cs: <http://pragma.canonical.com/codestandards#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# ---- Classes ----

dso:UIBlock a owl:Class ;
  rdfs:label "UI Block" .

dso:Component a owl:Class ;
  rdfs:subClassOf dso:UIBlock ;
  rdfs:label "Component" .

dso:Pattern a owl:Class ;
  rdfs:subClassOf dso:UIBlock ;
  rdfs:label "Pattern" .

dso:Tier a owl:Class ;
  rdfs:label "Tier" .

dso:ModifierFamily a owl:Class ;
  rdfs:label "Modifier Family" .

dso:Modifier a owl:Class ;
  rdfs:label "Modifier" .

dso:Token a owl:Class ;
  rdfs:label "Design Token" .

dso:TokenType a owl:Class ;
  rdfs:label "Token Type" .

dso:ImplementationLibrary a owl:Class ;
  rdfs:label "Implementation Library" .

dso:ImplementationObject a owl:Class ;
  rdfs:label "Implementation Object" .

cs:CodeStandard a owl:Class ;
  rdfs:label "Code Standard" .

cs:Category a owl:Class ;
  rdfs:label "Standard Category" .

# ---- Properties ----

dso:name a owl:DatatypeProperty ;
  rdfs:domain dso:UIBlock ;
  rdfs:range xsd:string .

dso:tier a owl:ObjectProperty ;
  rdfs:domain dso:UIBlock .

dso:release a owl:ObjectProperty ;
  rdfs:domain dso:UIBlock .

dso:hasModifierFamily a owl:ObjectProperty ;
  rdfs:domain dso:UIBlock ;
  rdfs:range dso:ModifierFamily .

dso:modifierFamily a owl:ObjectProperty ;
  rdfs:domain dso:Modifier ;
  rdfs:range dso:ModifierFamily .

dso:tokenId a owl:DatatypeProperty ;
  rdfs:domain dso:Token ;
  rdfs:range xsd:string .

dso:tokenType a owl:ObjectProperty ;
  rdfs:domain dso:Token ;
  rdfs:range dso:TokenType .

dso:tokenTier a owl:ObjectProperty ;
  rdfs:domain dso:Token .

dso:valueLight a owl:DatatypeProperty ;
  rdfs:domain dso:Token ;
  rdfs:range xsd:string .

dso:valueDark a owl:DatatypeProperty ;
  rdfs:domain dso:Token ;
  rdfs:range xsd:string .

dso:platform a owl:DatatypeProperty ;
  rdfs:domain dso:ImplementationLibrary ;
  rdfs:range xsd:string .

dso:libraryName a owl:DatatypeProperty ;
  rdfs:domain dso:ImplementationLibrary ;
  rdfs:range xsd:string .

dso:hasImplementation a owl:ObjectProperty ;
  rdfs:domain dso:ImplementationLibrary ;
  rdfs:range dso:ImplementationObject .

dso:implementsBlock a owl:ObjectProperty ;
  rdfs:domain dso:ImplementationObject ;
  rdfs:range dso:UIBlock .

dso:headLink a owl:DatatypeProperty ;
  rdfs:domain dso:ImplementationObject ;
  rdfs:range xsd:string .

dso:usesToken a owl:ObjectProperty ;
  rdfs:domain dso:UIBlock ;
  rdfs:range dso:Token .

dso:anatomyNode a owl:ObjectProperty ;
  rdfs:domain dso:UIBlock .

cs:name a owl:DatatypeProperty ;
  rdfs:domain cs:CodeStandard ;
  rdfs:range xsd:string .

cs:hasCategory a owl:ObjectProperty ;
  rdfs:domain cs:CodeStandard ;
  rdfs:range cs:Category .

cs:slug a owl:DatatypeProperty ;
  rdfs:domain cs:Category ;
  rdfs:range xsd:string .

cs:description a owl:DatatypeProperty ;
  rdfs:domain cs:CodeStandard ;
  rdfs:range xsd:string .

cs:dos a owl:DatatypeProperty ;
  rdfs:domain cs:CodeStandard ;
  rdfs:range xsd:string .

cs:donts a owl:DatatypeProperty ;
  rdfs:domain cs:CodeStandard ;
  rdfs:range xsd:string .

cs:extends a owl:ObjectProperty ;
  rdfs:domain cs:CodeStandard ;
  rdfs:range cs:CodeStandard .
`;

// =============================================================================
// Tier instances
// =============================================================================

export const DS_TIERS_TTL = `
@prefix ds: <https://ds.canonical.com/data/> .
@prefix dso: <https://ds.canonical.com/ontology#> .

ds:global a dso:Tier ;
  dso:name "global" .

ds:apps a dso:Tier ;
  dso:name "apps" .

ds:apps_lxd a dso:Tier ;
  dso:name "apps/lxd" .
`;

// =============================================================================
// Release channels
// =============================================================================

export const DS_RELEASES_TTL = `
@prefix ds: <https://ds.canonical.com/data/> .
@prefix dso: <https://ds.canonical.com/ontology#> .

ds:stable a dso:ReleaseChannel .
ds:experimental a dso:ReleaseChannel .
ds:alpha a dso:ReleaseChannel .
ds:beta a dso:ReleaseChannel .
`;

// =============================================================================
// Component instances
// =============================================================================

export const DS_COMPONENTS_TTL = `
@prefix ds: <https://ds.canonical.com/data/> .
@prefix dso: <https://ds.canonical.com/ontology#> .

ds:button a dso:Component ;
  dso:name "Button" ;
  dso:tier ds:global ;
  dso:release ds:stable ;
  dso:hasModifierFamily ds:modifier_family.importance ;
  dso:hasModifierFamily ds:modifier_family.density ;
  dso:usesToken ds:token.color.primary ;
  dso:anatomyNode ds:button_node.root ;
  dso:anatomyNode ds:button_node.label ;
  dso:anatomyNode ds:button_node.icon .

ds:button_node.root a dso:AnatomyNode ;
  dso:name "button" .

ds:button_node.label a dso:AnatomyNode ;
  dso:name "label" .

ds:button_node.icon a dso:AnatomyNode ;
  dso:name "icon" .

ds:card a dso:Component ;
  dso:name "Card" ;
  dso:tier ds:global ;
  dso:release ds:stable .

ds:lxd_panel a dso:Component ;
  dso:name "LXD Panel" ;
  dso:tier ds:apps_lxd ;
  dso:release ds:stable .

ds:beta_widget a dso:Component ;
  dso:name "Beta Widget" ;
  dso:tier ds:global ;
  dso:release ds:beta .
`;

// =============================================================================
// Implementation libraries and objects
// =============================================================================

export const DS_IMPLEMENTATIONS_TTL = `
@prefix ds: <https://ds.canonical.com/data/> .
@prefix dso: <https://ds.canonical.com/ontology#> .

ds:impl.react a dso:ImplementationLibrary ;
  dso:libraryName "@canonical/react-ds-global" ;
  dso:platform "react" ;
  dso:hasImplementation [
    a dso:ImplementationObject ;
    dso:implementsBlock ds:button ;
    dso:headLink "src/lib/Button/Button.tsx"
  ] , [
    a dso:ImplementationObject ;
    dso:implementsBlock ds:card ;
    dso:headLink "src/lib/Card/Card.tsx"
  ] .

ds:impl.svelte a dso:ImplementationLibrary ;
  dso:libraryName "@canonical/svelte-ds-global" ;
  dso:platform "svelte" .
`;

// =============================================================================
// Standards
// =============================================================================

export const DS_STANDARDS_TTL = `
@prefix cs: <http://pragma.canonical.com/codestandards#> .

cs:react_category a cs:Category ;
  cs:slug "react" .

cs:code_category a cs:Category ;
  cs:slug "code" .

cs:react_folder a cs:CodeStandard ;
  cs:name "react/component/folder-structure" ;
  cs:hasCategory cs:react_category ;
  cs:description "Components must follow the standard folder layout" ;
  cs:dos "Place component files in src/lib/ComponentName/" ;
  cs:dos "Include index.ts barrel export" ;
  cs:donts "Use flat directory with all components at same level" .

cs:react_props a cs:CodeStandard ;
  cs:name "react/component/props" ;
  cs:hasCategory cs:react_category ;
  cs:description "Props must extend the base HTML element type" ;
  cs:dos "Extend HTMLAttributes<HTMLElement>" ;
  cs:donts "Define props without extending HTML attributes" .

cs:code_purity a cs:CodeStandard ;
  cs:name "code/function/purity" ;
  cs:hasCategory cs:code_category ;
  cs:description "Functions should be pure where possible" ;
  cs:dos "Return same output for same input" ;
  cs:donts "Modify external state without annotation" .
`;

// =============================================================================
// Modifier families and modifier instances
// =============================================================================

export const DS_MODIFIERS_TTL = `
@prefix ds: <https://ds.canonical.com/data/> .
@prefix dso: <https://ds.canonical.com/ontology#> .

ds:modifier_family.importance a dso:ModifierFamily ;
  dso:name "importance" .

ds:mod_importance_default a dso:Modifier ;
  dso:name "default" ;
  dso:modifierFamily ds:modifier_family.importance .

ds:mod_importance_primary a dso:Modifier ;
  dso:name "primary" ;
  dso:modifierFamily ds:modifier_family.importance .

ds:mod_importance_secondary a dso:Modifier ;
  dso:name "secondary" ;
  dso:modifierFamily ds:modifier_family.importance .

ds:modifier_family.density a dso:ModifierFamily ;
  dso:name "density" .

ds:mod_density_default a dso:Modifier ;
  dso:name "default" ;
  dso:modifierFamily ds:modifier_family.density .

ds:mod_density_compact a dso:Modifier ;
  dso:name "compact" ;
  dso:modifierFamily ds:modifier_family.density .
`;

// =============================================================================
// Tokens
// =============================================================================

export const DS_TOKENS_TTL = `
@prefix ds: <https://ds.canonical.com/data/> .
@prefix dso: <https://ds.canonical.com/ontology#> .

ds:token_type.color a dso:TokenType ;
  rdfs:label "Color" .

ds:token_type.dimension a dso:TokenType ;
  rdfs:label "Dimension" .

ds:token.color.primary a dso:Token ;
  dso:tokenId "color.primary" ;
  dso:tokenType ds:token_type.color ;
  dso:tokenTier ds:token_tier.semantic ;
  dso:valueLight "#0066cc" ;
  dso:valueDark "#4d9aff" .

ds:token.spacing.sm a dso:Token ;
  dso:tokenId "spacing.sm" ;
  dso:tokenType ds:token_type.dimension ;
  dso:tokenTier ds:token_tier.primitive ;
  dso:valueLight "8px" ;
  dso:valueDark "8px" .
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
