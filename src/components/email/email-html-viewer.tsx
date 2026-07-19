import { useMemo, useState } from "react";

function stripDangerousHtml(input: string) {
  let html = input || "";

  // Remove scriptable/embedded content.
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  html = html.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  html = html.replace(/<embed\b[^>]*>/gi, "");

  // Remove inline event handlers like onclick/onload/onerror, etc.
  html = html.replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");

  // Remove javascript: URLs.
  html = html.replace(/\shref\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, ' href="#"');
  html = html.replace(/\ssrc\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, "");

  return html;
}

export function EmailHtmlViewer({ html }: { html: string }) {
  const [height, setHeight] = useState<number>(600);

  const srcDoc = useMemo(() => {
    const sanitizedHtml = stripDangerousHtml(html);
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base target="_blank" />
    <style>
      html, body {
        box-sizing: border-box;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0;
        padding: 14px;
        background: #ffffff;
        color: #111827;
        font-family: Arial, system-ui, -apple-system, Segoe UI, sans-serif;
        line-height: 1.5;
        overflow-x: hidden;
        overflow-wrap: anywhere;
      }
      *, *::before, *::after {
        box-sizing: border-box;
        max-width: 100% !important;
      }
      img {
        max-width: 100% !important;
        height: auto !important;
      }
      table {
        width: 100% !important;
        max-width: 100% !important;
        border-collapse: collapse;
        table-layout: fixed;
      }
      td, th {
        max-width: 100% !important;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      pre, code {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      a { color: #2563eb; }
      @media (max-width: 640px) {
        html, body { padding: 10px; }
      }
    </style>
  </head>
  <body>${sanitizedHtml}</body>
</html>`;
  }, [html]);

  return (
    <iframe
      title="Email content"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      className="block w-full max-w-full rounded-md border-0 bg-white"
      style={{ minHeight: 500, height, overflow: "hidden" }}
      onLoad={(e) => {
        try {
          const iframe = e.currentTarget;
          const doc = iframe.contentDocument;
          const body = doc?.body;
          if (!body) return;
          const next = Math.min(Math.max(body.scrollHeight + 16, 500), 2000);
          setHeight(next);
        } catch {
          // ignore
        }
      }}
    />
  );
}
