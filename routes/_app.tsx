import { PageProps } from "fresh";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TLA+ Playground</title>
        <script
          dangerouslySetInnerHTML={{ __html: "var r = null;" }}
        />
        <link
          rel="stylesheet"
          data-name="vs/editor/editor.main"
          href="https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.css"
        />
        <script src="https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/loader.js" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
