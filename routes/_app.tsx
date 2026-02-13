import { PageProps } from "fresh";

const MONACO_VERSION = "0.55.1";

export default function App({ Component }: PageProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TLA+ Playground</title>
        <link
          rel="stylesheet"
          href={`https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs/editor/editor.main.css`}
        />
        <link
          rel="modulepreload"
          href={`https://esm.sh/monaco-editor@${MONACO_VERSION}`}
        />
        <script>var r = null;</script>
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
