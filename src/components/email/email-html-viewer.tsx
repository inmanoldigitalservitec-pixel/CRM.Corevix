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
        margin: 0;
        padding: 16px;
        background: #ffffff;
        color: #111827;
        font-family: Arial, system-ui, -apple-system, Segoe UI, sans-serif;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
      img { max-width: 100%; height: auto; }
      table { max-width: 100%; }
      a { color: #2563eb; }
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
      className="w-full border-0 rounded-md bg-white"
      style={{ minHeight: 500, height }}
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
