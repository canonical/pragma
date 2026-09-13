import { type ReactNode, Suspense, use } from "react";
import { renderToReadableStream, renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HeadProvider from "../HeadProvider/Provider.js";
import Head from "./Head.js";

/**
 * The document shape the repository's server renderer produces: a full
 * `<html>` element, which is what React 19 needs in order to hoist head tags.
 */
function Document({
  children,
  shellTitle,
}: {
  children: ReactNode;
  shellTitle?: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        {shellTitle === undefined ? null : <title>{shellTitle}</title>}
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}

/** Declared at module scope, which is what the provider's docs ask for. */
function formatDocumentTitle(pageTitle: string): string {
  return `${pageTitle} — Ubuntu`;
}

function ProductPage() {
  return (
    <>
      <Head
        title="Widget"
        meta={[{ name: "description", content: "A widget" }]}
        link={[{ rel: "canonical", href: "https://example.com/widget" }]}
      />
      <h1>Widget</h1>
    </>
  );
}

/** The markup between `<head>` and `</head>`, which is what a crawler reads. */
function headOf(html: string): string {
  return html.match(/<head>(?<head>[\s\S]*?)<\/head>/)?.groups?.head ?? "";
}

/** The text of every `<title>` in the document, in the order it appears. */
function titlesOf(html: string): string[] {
  return [...html.matchAll(/<title[^>]*>(?<text>[^<]*)<\/title>/g)].map(
    (match) => match.groups?.text ?? "",
  );
}

async function readStream(stream: ReadableStream): Promise<string> {
  return await new Response(stream).text();
}

describe("Head (server rendering)", () => {
  it("emits the page's tags inside <head> with renderToString", () => {
    const html = renderToString(
      <Document>
        <ProductPage />
      </Document>,
    );
    const head = headOf(html);

    expect(head).toContain("<title>Widget</title>");
    expect(head).toContain('<meta name="description" content="A widget"/>');
    expect(head).toContain(
      '<link rel="canonical" href="https://example.com/widget"/>',
    );
    expect(html).toContain("<h1>Widget</h1>");
  });

  it("emits the page's tags inside <head> when streaming", async () => {
    const stream = await renderToReadableStream(
      <Document>
        <ProductPage />
      </Document>,
    );
    await stream.allReady;
    const head = headOf(await readStream(stream));

    expect(head).toContain("<title>Widget</title>");
    expect(head).toContain('<meta name="description" content="A widget"/>');
    expect(head).toContain(
      '<link rel="canonical" href="https://example.com/widget"/>',
    );
  });

  it("composes the server-rendered title with the provider's template", () => {
    const html = renderToString(
      <Document>
        <HeadProvider titleTemplate={formatDocumentTitle}>
          <ProductPage />
        </HeadProvider>
      </Document>,
    );

    expect(headOf(html)).toContain("<title>Widget — Ubuntu</title>");
  });

  it("escapes markup in a title rather than emitting it", () => {
    const html = renderToString(
      <Document>
        <Head title={'<script>alert("xss")</script>'} />
      </Document>,
    );

    expect(headOf(html)).toContain(
      "<title>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</title>",
    );
  });

  /**
   * Why the package tells you not to let the component that renders `Head`
   * suspend: React can only hoist a tag into a `<head>` it has already
   * flushed. This is the shape that loses the tags, pinned so the caveat
   * cannot quietly stop being true.
   */
  it("streams a suspended page's tags after the shell, not into it", async () => {
    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve("Slow"), 10);
    });

    function SlowPage() {
      const label = use(slow);

      return (
        <>
          <Head title={label} />
          <p>{label}</p>
        </>
      );
    }

    const stream = await renderToReadableStream(
      <Document>
        <Suspense fallback={<p>Loading…</p>}>
          <SlowPage />
        </Suspense>
      </Document>,
    );
    // Read progressively, as a server does: the shell goes out first, and the
    // suspended content follows it. Awaiting `allReady` would buffer the whole
    // document and hide the very thing this pins.
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const shell = decoder.decode((await reader.read()).value);
    let rest = "";

    for (;;) {
      const { done, value } = await reader.read();

      if (done) break;
      rest += decoder.decode(value);
    }

    expect(shell).toContain("</head>");
    expect(headOf(shell)).not.toContain("<title>");
    expect(rest).toContain("<title>Slow</title>");
  });

  /**
   * Why the package documents one owner per document, pinned rather than
   * merely asserted: React emits every `<title>` it renders and HTML takes the
   * first in tree order, so a second owner does not merge with the page — it
   * beats it. Both owners a real application can acquire are recorded here.
   */
  describe("one owner per document", () => {
    it("puts a layout's title ahead of the page's", () => {
      const html = renderToString(
        <Document>
          <Head title="Layout" />
          <ProductPage />
        </Document>,
      );

      expect(titlesOf(html)).toEqual(["Layout", "Widget"]);
    });

    it("puts the HTML shell's title ahead of the page's", () => {
      const html = renderToString(
        <Document shellTitle="Shell">
          <ProductPage />
        </Document>,
      );

      expect(titlesOf(html)).toEqual(["Shell", "Widget"]);
    });

    it("leaves the page as the only owner when neither claims it", () => {
      const html = renderToString(
        <Document>
          <ProductPage />
        </Document>,
      );

      expect(titlesOf(html)).toEqual(["Widget"]);
    });
  });
});
