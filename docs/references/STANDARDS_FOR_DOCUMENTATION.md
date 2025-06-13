# Documentation Standards Reference

This document outlines the standards and conventions for writing documentation within the Canonical Design System. It aims to ensure consistency, clarity, and usability across all documentation.

## Diataxis

We use the [Diátaxis documentation framework](https://diataxis.fr/) to guide our approach to documentation. 
We recommend reviewing the [Diátaxis starter guide](https://diataxis.fr/start-here/) to understand the format and benefits of the approach before continuing.

## Introduction

Our documentation practices are guided by the following core principles:

* **Clarity:** Documentation should be clear, concise, and easy to understand.
* **Consistency:** Documentation should follow consistent patterns and structures.
* **Completeness:** Documentation should cover all necessary aspects without being overwhelming.
* **Maintainability:** Documentation should be easy to update and maintain.

## Documentation Types (`docs/types`)

### Tutorials (`docs/types/tutorials`)
Tutorials **shall** be learning-oriented, step-by-step guides that help users achieve specific goals:

1. **Location**: `docs/how-to-guides/`
2. **Format**: Narrative, task-oriented
3. **Structure**: Clear steps with verification points
4. **Scope**: Single, specific task or workflow

> ✅ **Do**
> 
> + Write in a clear, instructional tone
> + Include verification steps
> + Provide context for each step
> + Link to relevant reference documentation

> ❌ **Don't**
>
> + Mix multiple unrelated tasks
> + Skip verification steps
> + Use technical jargon without explanation
> + Assume prior knowledge

### How-to Guides (`docs/types/how-to-guides`)
How-to guides **shall** be task-oriented, providing solutions to specific problems:

1. **Location**: `docs/how-to-guides/`
2. **Format**: Problem-solution focused
3. **Structure**: Clear problem statement, solution steps, verification
4. **Scope**: Single, specific problem

> ✅ **Do**
> 
> + Start with a clear problem statement
> + Provide step-by-step solutions
> + Include troubleshooting tips
> + Link to related documentation

> ❌ **Don't**
>
> + Mix multiple problems
> + Skip problem context
> + Use complex language
> + Omit verification steps

### Reference (`docs/types/reference`)
Reference documentation **shall** provide technical details and specifications:

1. **Location**: `docs/references/`
2. **Format**: Technical, detailed
3. **Structure**: Clear sections with URIs
4. **Scope**: Complete technical information

> ✅ **Do**
> 
> + Use clear, technical language
> + Include all necessary details
> + Follow consistent structure
> + Provide examples where helpful

> ❌ **Don't**
>
> + Include implementation details
> + Use ambiguous language
> + Skip required information
> + Mix different documentation types

### Explanation (`docs/types/explanation`)
Explanations **shall** provide understanding-oriented documentation:

1. **Location**: `docs/explanations/`
2. **Format**: Conceptual, understanding-focused
3. **Structure**: Clear concepts with examples
4. **Scope**: Single concept or decision

> ✅ **Do**
> 
> + Explain concepts clearly
> + Provide relevant examples
> + Link to related documentation
> + Include decision rationale

> ❌ **Don't**
>
> + Mix multiple concepts
> + Use technical jargon
> + Skip context
> + Omit examples

## Documentation Structure (`docs/structure`)

### File Organization (`docs/structure/file-organization`)
Documentation files **shall** be organized by type and purpose:

```
docs/
├── how-to-guides/     # Task-oriented guides
├── references/        # Technical reference documentation
├── explanations/      # Understanding-oriented documentation
└── standards/         # Documentation standards
```

> ✅ **Do**
> 
> + Place files in appropriate directories
> + Use consistent file naming
> + Maintain clear directory structure
> + Keep related files together

> ❌ **Don't**
>
> + Mix documentation types
> + Use inconsistent naming
> + Create deep directory structures
> + Place files in wrong directories

### File Naming (`docs/structure/file-naming`)
Documentation files **shall** follow consistent naming conventions:

1. **Standards**: `STANDARDS_FOR_<TOPIC>.md`
2. **How-to Guides**: `HOW_TO_<VERB>_<NOUN>.md`
3. **References**: `<TOPIC>_REFERENCE.md`
4. **Explanations**: `<TOPIC>_EXPLANATION.md`

> ✅ **Do**
> 
> + Use clear, descriptive names
> + Follow naming conventions
> + Use consistent capitalization
> + Include file extensions

> ❌ **Don't**
>
> + Use ambiguous names
> + Mix naming conventions
> + Use special characters
> + Skip file extensions

## Content Standards (`docs/content`)

### Writing Style (`docs/content/writing-style`)
Documentation **shall** follow consistent writing standards:

1. **Tone**: Clear, professional, and accessible
2. **Language**: Simple, direct, and precise
3. **Format**: Consistent markdown formatting
4. **Links**: Descriptive and relevant

> ✅ **Do**
> 
> + Use clear, simple language
> + Write in active voice
> + Use consistent formatting
> + Include relevant links

> ❌ **Don't**
>
> + Use complex language
> + Write in passive voice
> + Mix formatting styles
> + Include broken links

### Code Examples (`docs/content/code-examples`)
Code examples **shall** be clear and follow standards:

1. **Format**: Properly formatted code blocks
2. **Language**: Specified language for syntax highlighting
3. **Context**: Clear explanation of purpose
4. **Completeness**: Runnable, complete examples

> ✅ **Do**
> 
> + Use proper code block formatting
> + Specify language for syntax highlighting
> + Provide clear context
> + Include complete examples

> ❌ **Don't**
>
> + Use unformatted code
> + Skip language specification
> + Provide incomplete examples
> + Mix different code styles

## Maintenance (`docs/maintenance`)

### Updates (`docs/maintenance/updates`)
Documentation **shall** be kept up to date:

1. **Frequency**: Regular reviews and updates
2. **Process**: Clear update procedures
3. **Versioning**: Track changes appropriately
4. **Review**: Peer review for accuracy

> ✅ **Do**
> 
> + Review documentation regularly
> + Update when code changes
> + Track documentation changes
> + Get peer review for updates

> ❌ **Don't**
>
> + Leave outdated information
> + Skip review process
> + Ignore code changes
> + Make undocumented updates

### Quality Assurance (`docs/maintenance/quality`)
Documentation **shall** undergo quality checks:

1. **Accuracy**: Technical accuracy verification
2. **Completeness**: Required information present
3. **Clarity**: Clear and understandable
4. **Consistency**: Follows standards

> ✅ **Do**
> 
> + Verify technical accuracy
> + Check for completeness
> + Ensure clarity
> + Maintain consistency

> ❌ **Don't**
>
> + Skip accuracy checks
> + Leave gaps in information
> + Use unclear language
> + Ignore standards
