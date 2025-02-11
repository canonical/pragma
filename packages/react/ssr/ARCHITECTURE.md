# Architectural Considerations and Design of `@canonical/react-ssr`

This document outlines the architectural considerations and design choices made for the `@canonical/react-ssr` package, a library designed to simplify server-side rendering (SSR) for React applications.

## 1. Goals

The primary goals of this package are:

*   **Simplicity:** Provide a straightforward and easy-to-use API for implementing SSR in React applications, minimizing boilerplate.
*   **Flexibility:** Allow customization of the SSR process, including injecting custom scripts and handling different rendering options.
*   **Performance:** Leverage React's streaming capabilities for efficient rendering and improved Time to First Byte (TTFB).
*   **Maintainability:**  Design a modular and well-structured codebase for easy maintenance and future extensions.
*   **Compatibility:** Work seamlessly with common build tools like Vite and Webpack.
*   **Typesafety:** Utilize Typescript to avoid common pitfalls.

## 2. Core Components and Design

The package is structured around a few key components:

*   **`JSXRenderer` (src/renderer/JSXRenderer.ts):**  This is the central class for handling the server-side rendering process.  It takes a React component (the server entry point) and rendering options, and provides a `render` method that returns a `PipeableStream`.  This leverages React's `renderToPipeableStream` API for efficient streaming of the rendered HTML.

*   **`Extractor` (src/renderer/Extractor.ts):**  This class is responsible for parsing an HTML string (typically the output of the client-side build) and extracting `<script>` and `<link>` tags.  It converts these tags into React elements, which can then be injected into the server-rendered HTML. This ensures that the client-side JavaScript and CSS are correctly included for hydration.

*   **`ReactServerEntrypointComponent` (src/renderer/JSXRenderer.ts):** This is a type definition for the server-side entry point component.  It defines the props that the component will receive, including `lang`, `scriptTags`, and `linkTags`.  This promotes type safety and clear communication of data flow.

*   **`serveStream` (src/server/serve.ts):** This function provides a convenient way to integrate the `JSXRenderer` with an HTTP server (like Express). It takes a `RenderHandler` (the `render` method of a `JSXRenderer` instance) and returns a middleware function that handles the request and streams the rendered HTML to the client.

*   **`serve-express` (src/server/serve-express.ts):** A command-line utility (exposed as a binary) to quickly set up an Express server for SSR. This simplifies the development and testing process.

## 3. Workflow and Data Flow

The typical SSR workflow with `@canonical/react-ssr` is as follows:

1.  **Client-Side Build:** The client-side application is built using a bundler (e.g., Vite, Webpack).  This generates the client-side JavaScript bundle(s) and potentially an `index.html` file.

2.  **Server-Side Build:** The server-side entry point (e.g., `entry-server.tsx`) is built. This entry point imports the main application component and wraps it in an HTML structure.

3.  **Server Startup:**  An HTTP server (e.g., Express) is started.  It uses `serveStream` and an instance of `JSXRenderer` to handle incoming requests.

4.  **Request Handling:**
  *   When a request comes in, `serveStream` calls the provided `RenderHandler` (the `render` method of the `JSXRenderer`).
  *   The `JSXRenderer` creates a React element from the server entry point component, passing in props like `lang`, `scriptTags`, and `linkTags`.  The `scriptTags` and `linkTags` are extracted from the client-side build's HTML file using the `Extractor`.
  *   `renderToPipeableStream` is used to render the React element to a stream.
  *   The stream is piped to the client's response (`res`).
  *   Error handling is built into the stream rendering, with different error handling for shell errors and in-stream errors.

5.  **Client-Side Hydration:** The client-side entry point (e.g., `entry-client.tsx`) uses `hydrateRoot` to attach the React application to the server-rendered HTML. This "rehydrates" the application, making it interactive.

## 4. Key Design Decisions

*   **Streaming:** The core of the package relies on React's `renderToPipeableStream`. This allows for:
  *   **Improved TTFB:** The server can start sending HTML to the client before the entire application is rendered.
  *   **Reduced Memory Usage:** The server doesn't need to hold the entire rendered HTML in memory.
  *   **Better User Experience:** The browser can start parsing and rendering the HTML sooner, leading to faster perceived performance.

*   **HTML Parsing (`Extractor`):** Instead of relying on string manipulation or template literals, the `Extractor` uses `htmlparser2` and `domhandler` to parse the client-side HTML and extract the necessary tags. This approach is:
  *   **More Robust:** Less prone to errors caused by variations in HTML structure.
  *   **More Maintainable:** Easier to update and adapt to changes in the client-side build output.
  *   **More Secure:** Reduces the risk of XSS vulnerabilities that can arise from manual string manipulation.

*   **Separation of Concerns:** The package is divided into distinct modules (`renderer` and `server`) with clear responsibilities. This makes the code easier to understand, test, and maintain.

*   **Type Safety:** TypeScript is used throughout the package to provide type safety and improve code quality.  The `RendererServerEntrypointProps` interface and other type definitions ensure that data flows correctly between different parts of the system.

*   **Flexibility with `renderToPipeableStreamOptions`:** The `JSXRenderer` accepts `renderToPipeableStreamOptions` which are passed directly to React's `renderToPipeableStream`. This allows developers to customize the rendering process using React's built-in options (e.g., `bootstrapModules`, `identifierPrefix`).

*   **CLI for Express:** The `serve-express` binary simplifies the process of setting up a basic Express server for SSR, providing a quick way to get started.

## 5. Potential Improvements and Future Considerations

*   **Support for other server frameworks:**  Currently, the `serve-express` utility is specific to Express.  Adding support for other frameworks (e.g., Fastify, Koa) could increase the package's versatility.
*   **Built-in caching:** Implementing caching mechanisms (e.g., at the component level or for entire pages) could further improve performance.
*   **More advanced error handling:**  Providing more detailed error information and potentially allowing for custom error handling strategies could improve the developer experience.
*   **Integration with data fetching libraries:** Exploring integrations with popular data fetching libraries (e.g., Apollo Client, Relay) could simplify the process of fetching data on the server.
* **Alternative to htmlparser2**: Consider an alternative to `htmlparser2` if a lighter-weight or faster option is available, while maintaining robust parsing capabilities.
* **Automated script/link tag injection:** Instead of requiring developers to manually pass an `htmlString`, investigate automatically detecting and injecting script/link tags based on build output (e.g., by parsing a manifest file).

## 6. Conclusion

`@canonical/react-ssr` provides a streamlined and efficient way to implement server-side rendering in React applications. Its design prioritizes simplicity, performance, and flexibility, while leveraging React's streaming capabilities. The modular structure and use of TypeScript contribute to its maintainability and robustness. The package provides a solid foundation for building performant and SEO-friendly React applications.