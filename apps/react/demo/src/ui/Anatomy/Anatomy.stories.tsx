/* @canonical/generator-ds 0.9.0-experimental.12 */

import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import Component from "./Anatomy.js";
import type { AnatomyProps } from "./types.js";

const meta = {
	title: "Anatomy",
	component: Component,
	args: {
		yamlContent: `
core:component:Card:
  edges:
    - node:
        uri: core:component:Card.Header
        invariantStyles:
          display: flex
          flexDirection: row
          alignItems: center
        styles:
          padding: tokens/spacing/medium
      relation:
        cardinality: 0..1
        slotName: header
    - node:
        uri: core:component:Card.Body
        invariantStyles:
          display: flex
          flexDirection: column
          flex: 1
      relation:
        cardinality: 1..1
        slotName: body
    - node:
        uri: core:component:Card.Footer
        invariantStyles:
          display: flex
          flexDirection: row
          justifyContent: space-between
      relation:
        cardinality: 0..1
        slotName: footer
  invariantStyles:
    display: flex
    flexDirection: column`,
	},
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
  CSF3 story
  Uses object-based story declarations with strong TS support (`Meta` and `StoryObj`).
  Uses the latest storybook format.
*/

export const Default: Story = {
	args: {},
};

export const WithAccordion: Story = {
	args: {
		yamlContent: `
core:component:Accordion:
  edges:
    - node:
        uri: core:component:Accordion.Item
        edges:
          - node:
              uri: core:component:Accordion.Item.Header
              invariantStyles:
                display: flex
                flexDirection: row
                alignItems: center
                cursor: pointer
              styles:
                padding: tokens/spacing/medium
                background: tokens/color/surface/header
            relation:
              cardinality: 1..1
              slotName: header
          - node:
              uri: core:component:Accordion.Item.Content
              invariantStyles:
                display: block
                overflow: hidden
              styles:
                padding: tokens/spacing/large
                background: tokens/color/surface/content
            relation:
              cardinality: 1..1
              slotName: default
      relation:
        cardinality: 0..*
        type: component
  invariantStyles:
    display: flex
    flexDirection: column
  styles:
    border: tokens/border/style/accordion
    boxShadow: none`,
	},
};

export const ComplexNesting: Story = {
	args: {
		yamlContent: `
core:component:Table:
  edges:
    - node:
        uri: core:component:Table.Header
        edges:
          - node:
              uri: core:component:Table.Row
              edges:
                - node:
                    uri: core:component:Table.Header.Cell
                    invariantStyles:
                      display: table-cell
                      fontWeight: bold
                  relation:
                    cardinality: 1..*
                    slotName: cell
              invariantStyles:
                display: table-row
            relation:
              cardinality: 1..*
              slotName: row
        invariantStyles:
          display: table-header-group
      relation:
        cardinality: 0..1
        slotName: header
    - node:
        uri: core:component:Table.Body
        edges:
          - node:
              uri: core:component:Table.Row
              edges:
                - node:
                    uri: core:component:Table.Cell
                    invariantStyles:
                      display: table-cell
                  relation:
                    cardinality: 1..*
                    slotName: cell
              invariantStyles:
                display: table-row
            relation:
              cardinality: 0..*
              slotName: row
        invariantStyles:
          display: table-row-group
      relation:
        cardinality: 1..1
        slotName: body
  invariantStyles:
    display: table
    width: 100%`,
	},
};

export const InvalidYaml: Story = {
	args: {
		yamlContent: "invalid: yaml: content: [unclosed bracket",
	},
};

export const Empty: Story = {
	args: {
		yamlContent: "",
	},
};

export const WithCustomStyles: Story = {
	args: {
		style: {
			border: "2px solid blue",
			borderRadius: "12px",
			padding: "2rem",
		},
		className: "custom-anatomy-class",
	},
};

export const SimpleButton: Story = {
	args: {
		yamlContent: `core:component:Button:
  invariantStyles:
    display: inline-flex
    alignItems: center
    justifyContent: center
    cursor: pointer
    border: none
    borderRadius: 4px
  styles:
    padding: tokens/spacing/medium
    background: tokens/color/primary
    color: tokens/color/text/inverse`,
	},
};

// Hide this story from the sidebar but keep for visual regression testing
SimpleButton.tags = ["!dev"];

export const AnonymousNodes: Story = {
	args: {
		yamlContent: `core:component:Container:
  edges:
    - node:
        uri: anonymous:div
        invariantStyles:
          display: block
          position: relative
        edges:
          - node:
              uri: anonymous:span
              invariantStyles:
                display: inline-block
                padding: 0.5rem
            relation:
              cardinality: 0..*
      relation:
        cardinality: 1..1
  invariantStyles:
    display: flex
    flexDirection: column`,
	},
};

// Visual regression testing parameters
Default.parameters = {
	chromatic: {
		viewports: [1200, 768, 375],
	},
};

InvalidYaml.parameters = {
	chromatic: {
		disable: true,
	},
};
