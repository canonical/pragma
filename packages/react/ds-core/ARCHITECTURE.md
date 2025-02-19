## Canonical Design System - React Core - Architecture

A guide to understand the design principles, key components, and technologies used in the core React component library.

This document is primarily focused on providing a clear explanation of the architecture for users who
want to understand the 'why' and 'how' behind its structure and design.

## 1. Explanation: Architecture Overview

### 1.1 Core Goals and Design Principles

Our architecture is driven by several core goals and design principles:

* **Reusable Components:** The primary goal is to create a library of reusable React components. These components are
  designed to be building blocks for various applications, promoting consistency and efficiency in development.
* **Design System Consistency:**  All components are built to adhere to Canonical's visual identity by default. This
  ensures a unified and recognizable user interface across all applications that utilize this library.
* **Accessibility First:** Accessibility is not an afterthought but a fundamental principle. Components are designed and
  developed with accessibility best practices in mind, ensuring usability for everyone.
* **Modern Development Practices:**  The library embraces modern development tools and practices to enhance developer
  experience, maintainability, and performance.
* **Maintainability and Extensibility:** The architecture is structured to be easily maintainable and extensible. The
  styling layer can be customized or extended to accommodate different design requirements and visual variations beyond
  the Canonical design system.
* **Testability and Reliability:**  Robust testing is integral to the architecture, ensuring the reliability and
  stability of the components.

### 1.2 Tooling Choices

On top of the [root-level architecture](../../../guides/ARCHITECTURE.md), this package leverages a modern React
toolchain to achieve its goals:

| Tool(s)                                      | Enables                                                                     | Benefits                                                                              |
|----------------------------------------------|-----------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| [React 19](https://react.dev)                | Latest features, performance, and broad ecosystem compatibility             | Improved functionality, efficiency, and access to a wide range of libraries and tools |
| [Vite](https://vite.dev)                     | Fast development server, Hot Module Replacement (HMR), and optimized builds | Quick dev feedback loops, faster loading times, and improved performance              |
| [Storybook](https://storybook.js.org/)       | Isolated component development and living style guide with documentation    | Focused development and testing, centralized and interactive documentation            |

### 1.3 Component-Based Structure

This package is organized around a component-based architecture. The core components reside within the `src/ui/`
directory.
This offers several advantages:

* **Modularity and Reusability:** Components are self-contained and designed for reuse across different parts of an
  application or across multiple projects. This modularity reduces code duplication and promotes consistency.
* **Encapsulation and Maintainability:** Each component encapsulates its logic, styling, and tests, making it easier to
  maintain and update individual components without causing ripple effects across the entire library.
* **Composition and Flexibility:** Complex user interfaces can be constructed by composing simpler components. This
  compositional approach provides flexibility and allows developers to build a wide range of UIs using the provided
  building blocks.

