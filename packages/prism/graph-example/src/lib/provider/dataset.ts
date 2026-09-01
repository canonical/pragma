// =============================================================================
// The data file. A small fictional metro network — a TBox and an ABox.
//
// WHY A METRO NETWORK. This provider exists to show that the contract is
// implementable by someone who has never heard of pragma, so its subject
// matter must share no vocabulary with pragma's own graph (design systems,
// components, code standards, jobs, personas, surfaces, layouts). A transit
// network shares none. Biology and taxonomy were deliberately avoided: a
// domain with its own taxonomic ranks blurs the line between the subject's
// hierarchy and RDFS subclassing, and this file needs that line sharp.
//
// EVERYTHING HERE IS INERT. No functions, no getters, no computation — records
// and nothing else. All view construction lives in createExampleProvider.ts,
// which is what makes "a provider is some code and a data file" literally
// true rather than a figure of speech.
// =============================================================================

import {
  GEO_NAMESPACE,
  GEO_PREFIX,
  META_CLASS_URI,
  METRO_NAMESPACE,
  METRO_PREFIX,
  RDFS_NAMESPACE,
  RDFS_PREFIX,
} from "./constants.js";
import type { ExampleDataset } from "./types.js";

const STOP = `${METRO_NAMESPACE}Stop`;
const STATION = `${METRO_NAMESPACE}Station`;
const INTERCHANGE = `${METRO_NAMESPACE}Interchange`;
const LINE = `${METRO_NAMESPACE}Line`;
const GEO_POINT = `${GEO_NAMESPACE}GeoPoint`;
const ZONE = `${GEO_NAMESPACE}Zone`;

const NAME = `${METRO_NAMESPACE}name`;
const NOTE = `${METRO_NAMESPACE}note`;
const PLATFORM_COUNT = `${METRO_NAMESPACE}platformCount`;
const SERVES_LINE = `${METRO_NAMESPACE}servesLine`;
const SERVED_BY = `${METRO_NAMESPACE}servedBy`;
const TRANSFER_MINUTES = `${METRO_NAMESPACE}transferMinutes`;
const LOCATION = `${GEO_NAMESPACE}location`;
const LATITUDE = `${GEO_NAMESPACE}latitude`;
const LONGITUDE = `${GEO_NAMESPACE}longitude`;
const IN_ZONE = `${GEO_NAMESPACE}inZone`;

/** IRI of the entity carrying no descriptive predicates whatsoever. */
export const BARE_ENTITY_URI = `${METRO_NAMESPACE}ghost`;

/**
 * IRI whose local name is empty — the deepest fallback tier for a Node, and
 * the edge case that keeps `curie` honest (it compacts to a bare `metro:`).
 */
export const EMPTY_LOCAL_NAME_URI = METRO_NAMESPACE;

/** IRI of the station carrying labels in more than one language. */
export const MULTILINGUAL_ENTITY_URI = `${METRO_NAMESPACE}northgate`;

/** IRI of an entity in the SECOND namespace — the curie prefix must differ. */
export const SECOND_NAMESPACE_ENTITY_URI = `${GEO_NAMESPACE}central-zone`;

export const exampleDataset: ExampleDataset = {
  ontologies: [
    {
      prefix: METRO_PREFIX,
      namespace: METRO_NAMESPACE,
      label: "Metro Network Ontology",
    },
    // No label: Ontology.label is nullable, and something has to prove it.
    { prefix: GEO_PREFIX, namespace: GEO_NAMESPACE },
    { prefix: RDFS_PREFIX, namespace: RDFS_NAMESPACE, label: "RDF Schema" },
  ],

  // ---------------------------------------------------------------------
  // TBox. Three levels of metro hierarchy (Stop -> Station -> Interchange)
  // so `superclasses` has something transitive to be transitive about, plus
  // two further roots so `superclass: null` is exercised.
  // ---------------------------------------------------------------------
  classes: [
    {
      uri: STOP,
      labels: { "": "Stop" },
      definitions: { "": "Any place a service calls at." },
      comments: { "": "Abstract: instantiate Station or a subclass instead." },
      isAbstract: true,
      properties: [
        { property: NAME, required: true, singular: true },
        { property: NOTE, required: false, singular: true },
      ],
    },
    {
      uri: STATION,
      labels: { "": "Station", fr: "Gare" },
      definitions: { "": "A staffed stop with platforms." },
      superclass: STOP,
      isAbstract: false,
      properties: [
        { property: PLATFORM_COUNT, required: false, singular: true },
        { property: SERVES_LINE, required: true, singular: false },
        { property: LOCATION, required: false, singular: true },
        { property: IN_ZONE, required: false, singular: true },
      ],
    },
    {
      uri: INTERCHANGE,
      labels: { "": "Interchange" },
      definitions: { "": "A station where two or more lines meet." },
      superclass: STATION,
      isAbstract: false,
      properties: [
        { property: TRANSFER_MINUTES, required: false, singular: true },
      ],
    },
    {
      uri: LINE,
      labels: { "": "Line" },
      definitions: { "": "A named route through the network." },
      isAbstract: false,
      properties: [
        { property: NAME, required: true, singular: true },
        { property: SERVED_BY, required: false, singular: false },
      ],
    },
    {
      uri: GEO_POINT,
      labels: { "": "Geo point" },
      definitions: { "": "A latitude/longitude pair on the WGS 84 datum." },
      isAbstract: false,
      properties: [
        { property: LATITUDE, required: true, singular: true },
        { property: LONGITUDE, required: true, singular: true },
      ],
    },
    {
      // A class in the SECOND namespace that actually has instances. Without
      // it every entity would compact to `metro:` and the curie logic could
      // hardcode one prefix and still look correct.
      uri: ZONE,
      labels: { "": "Fare zone" },
      definitions: { "": "A fare band covering part of the network." },
      isAbstract: false,
      properties: [{ property: NAME, required: true, singular: true }],
    },
    {
      // The metaclass. Present because `EntityMeta.type` is non-null and
      // OntologyClass implements Node, so a class needs a class. In RDFS
      // `rdfs:Class` is an instance of itself, so the tower terminates
      // honestly rather than by fiat. It declares no properties, which also
      // gives `_meta.fields` an empty-list case to be tested against.
      uri: META_CLASS_URI,
      labels: { "": "Class" },
      definitions: { "": "The class of classes." },
      isAbstract: false,
      properties: [],
    },
  ],

  // ---------------------------------------------------------------------
  // Properties. All three PropertyKind members appear, `functional` appears
  // in both states, `domain` appears both asserted and absent (the contract
  // makes it nullable), and one inverse pair round-trips.
  // ---------------------------------------------------------------------
  properties: [
    {
      uri: NAME,
      labels: { "": "name" },
      definitions: { "": "The name shown to passengers." },
      range: "String",
      kind: "DATATYPE",
      functional: true,
    },
    {
      uri: NOTE,
      labels: { "": "note" },
      range: "String",
      kind: "ANNOTATION",
      functional: false,
    },
    {
      uri: PLATFORM_COUNT,
      labels: { "": "platform count" },
      domain: STATION,
      range: "Int",
      kind: "DATATYPE",
      functional: true,
    },
    {
      uri: SERVES_LINE,
      labels: { "": "serves line" },
      domain: STATION,
      range: "metro:Line",
      kind: "OBJECT",
      functional: false,
      inverse: SERVED_BY,
    },
    {
      uri: SERVED_BY,
      labels: { "": "served by" },
      domain: LINE,
      range: "metro:Station",
      kind: "OBJECT",
      functional: false,
      inverse: SERVES_LINE,
    },
    {
      uri: TRANSFER_MINUTES,
      labels: { "": "transfer minutes" },
      domain: INTERCHANGE,
      range: "Int",
      kind: "DATATYPE",
      functional: true,
    },
    {
      uri: LOCATION,
      labels: { "": "location" },
      domain: STATION,
      range: "geo:GeoPoint",
      kind: "OBJECT",
      functional: true,
    },
    {
      uri: LATITUDE,
      labels: { "": "latitude" },
      domain: GEO_POINT,
      range: "Float",
      kind: "DATATYPE",
      functional: true,
    },
    {
      uri: LONGITUDE,
      labels: { "": "longitude" },
      domain: GEO_POINT,
      range: "Float",
      kind: "DATATYPE",
      functional: true,
    },
    {
      uri: IN_ZONE,
      labels: { "": "in zone" },
      domain: STATION,
      range: "geo:Zone",
      kind: "OBJECT",
      functional: true,
    },
  ],

  // ---------------------------------------------------------------------
  // ABox. Fourteen direct Stations plus two Interchanges, so `instances`
  // paging has more than one page to page over and `hasNextPage` is a real
  // answer rather than a constant.
  // ---------------------------------------------------------------------
  entities: [
    {
      uri: `${METRO_NAMESPACE}north-line`,
      type: LINE,
      typename: "Line",
      labels: { "": "North Line" },
      definitions: { "": "Northgate to Marsh End, via the old cutting." },
    },
    {
      uri: `${METRO_NAMESPACE}circle-line`,
      type: LINE,
      typename: "Line",
      labels: { "": "Circle Line", fr: "Ligne Circulaire" },
      comments: { "": "Runs both directions; timetable is symmetric." },
    },
    {
      uri: `${METRO_NAMESPACE}coastal-line`,
      type: LINE,
      typename: "Line",
      labels: { "": "Coastal Line" },
    },

    // Entities in the geo namespace. Their curies must come out `geo:…`
    // while every station comes out `metro:…`, which is only possible if the
    // prefix is resolved per entity.
    {
      uri: SECOND_NAMESPACE_ENTITY_URI,
      type: ZONE,
      typename: "Zone",
      labels: { "": "Central Zone" },
      definitions: { "": "The innermost fare band." },
    },
    {
      uri: `${GEO_NAMESPACE}coastal-zone`,
      type: ZONE,
      typename: "Zone",
      labels: { "": "Coastal Zone" },
    },

    {
      uri: MULTILINGUAL_ENTITY_URI,
      type: STATION,
      typename: "Station",
      inZone: SECOND_NAMESPACE_ENTITY_URI,
      // Two languages, so `title(lang:)` and `label(lang:)` are demonstrably
      // implemented rather than accepted and ignored.
      labels: { "": "Northgate", fr: "Porte-Nord" },
      definitions: { "": "The northern terminus." },
      platformCount: 4,
      location: { latitude: 51.5412, longitude: -0.1435 },
      servesLine: [`${METRO_NAMESPACE}north-line`],
    },
    {
      uri: `${METRO_NAMESPACE}harbourside`,
      inZone: `${GEO_NAMESPACE}coastal-zone`,
      type: STATION,
      typename: "Station",
      labels: { "": "Harbourside" },
      comments: { "": "Step-free to all platforms." },
      platformCount: 2,
      location: { latitude: 51.5008, longitude: -0.1246 },
      servesLine: [`${METRO_NAMESPACE}coastal-line`],
    },
    {
      uri: `${METRO_NAMESPACE}kilnwood`,
      type: STATION,
      typename: "Station",
      labels: { "": "Kilnwood" },
      platformCount: 2,
      servesLine: [`${METRO_NAMESPACE}circle-line`],
    },
    {
      uri: `${METRO_NAMESPACE}marsh-end`,
      type: STATION,
      typename: "Station",
      labels: { "": "Marsh End" },
      platformCount: 1,
      servesLine: [`${METRO_NAMESPACE}north-line`],
    },
    {
      uri: `${METRO_NAMESPACE}quarry-hill`,
      type: STATION,
      typename: "Station",
      labels: { "": "Quarry Hill" },
      platformCount: 2,
      servesLine: [`${METRO_NAMESPACE}circle-line`],
    },
    {
      uri: `${METRO_NAMESPACE}saltford`,
      inZone: `${GEO_NAMESPACE}coastal-zone`,
      type: STATION,
      typename: "Station",
      labels: { "": "Saltford" },
      platformCount: 3,
      servesLine: [`${METRO_NAMESPACE}coastal-line`],
    },
    {
      uri: `${METRO_NAMESPACE}tannery-lane`,
      type: STATION,
      typename: "Station",
      labels: { "": "Tannery Lane" },
      platformCount: 2,
      servesLine: [`${METRO_NAMESPACE}circle-line`],
    },
    {
      uri: `${METRO_NAMESPACE}verge-park`,
      type: STATION,
      typename: "Station",
      labels: { "": "Verge Park" },
      platformCount: 2,
      servesLine: [`${METRO_NAMESPACE}north-line`],
    },
    {
      uri: `${METRO_NAMESPACE}willowbank`,
      type: STATION,
      typename: "Station",
      labels: { "": "Willowbank" },
      platformCount: 1,
      servesLine: [`${METRO_NAMESPACE}circle-line`],
    },
    {
      uri: `${METRO_NAMESPACE}eastcliff`,
      inZone: `${GEO_NAMESPACE}coastal-zone`,
      type: STATION,
      typename: "Station",
      labels: { "": "Eastcliff" },
      platformCount: 2,
      location: { latitude: 51.4934, longitude: 0.0098 },
      servesLine: [`${METRO_NAMESPACE}coastal-line`],
    },
    {
      uri: `${METRO_NAMESPACE}foundry-row`,
      type: STATION,
      typename: "Station",
      labels: { "": "Foundry Row" },
      platformCount: 2,
      servesLine: [`${METRO_NAMESPACE}north-line`],
    },
    {
      uri: `${METRO_NAMESPACE}greenhithe`,
      type: STATION,
      typename: "Station",
      labels: { "": "Greenhithe" },
      platformCount: 1,
      servesLine: [`${METRO_NAMESPACE}coastal-line`],
    },

    // The awkward two. Neither has a single descriptive predicate, and the
    // contract still demands a non-null `_meta.title` for both.
    {
      // No label, no comment, no definition, no name, no line. Only an IRI
      // and a class — the minimum an entity can be. Title falls to the local
      // name, "ghost".
      uri: BARE_ENTITY_URI,
      type: STATION,
      typename: "Station",
    },
    {
      // IRI ends in a separator, so the local name is the empty string and
      // the title has to fall through to the whole IRI.
      uri: EMPTY_LOCAL_NAME_URI,
      type: STATION,
      typename: "Station",
    },

    {
      uri: `${METRO_NAMESPACE}central-exchange`,
      inZone: `${GEO_NAMESPACE}central-zone`,
      type: INTERCHANGE,
      typename: "Interchange",
      labels: { "": "Central Exchange" },
      definitions: { "": "The busiest transfer point on the network." },
      platformCount: 8,
      transferMinutes: 4,
      location: { latitude: 51.5074, longitude: -0.1278 },
      servesLine: [
        `${METRO_NAMESPACE}north-line`,
        `${METRO_NAMESPACE}circle-line`,
        `${METRO_NAMESPACE}coastal-line`,
      ],
    },
    {
      uri: `${METRO_NAMESPACE}riverside-junction`,
      type: INTERCHANGE,
      typename: "Interchange",
      labels: { "": "Riverside Junction" },
      platformCount: 5,
      transferMinutes: 7,
      servesLine: [
        `${METRO_NAMESPACE}circle-line`,
        `${METRO_NAMESPACE}coastal-line`,
      ],
    },
  ],
};
