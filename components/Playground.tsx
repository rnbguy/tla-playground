import { Head } from "$fresh/runtime.ts";
import PlaygroundBody from "../islands/PlaygroundBody.tsx";

interface PlaygroundProps {
  tla: string;
  inv: string;
  out: string;
}

export default function Playground(props: PlaygroundProps) {
  return (
    <html>
      <Head>
        <title>TLA+ Playground</title>
        <link
          rel="stylesheet"
          data-name="vs/editor/editor.main"
          href="https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.css"
        />
        <script src="https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/loader.js" />
        <script src="https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.nls.js" />
        <script src="https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.js" />
      </Head>
      <body>
        <PlaygroundBody {...props} />
      </body>
    </html>
  );
}
