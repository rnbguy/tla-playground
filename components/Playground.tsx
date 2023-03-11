import { Head } from "$fresh/runtime.ts";
import Run from "../islands/Run.tsx";

interface PlaygroundProps {
  snippetId: string | null;
}

export default function Playground(props: PlaygroundProps) {
  return (
    <html>
      <Head>
        <title>Playground - built with Fresh</title>
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
        <div class="mx-auto w-64 p-4 rounded shadow font-mono text-center">
          Snippet #{props.snippetId}
        </div>
        <Run snippetId={props.snippetId} />
      </body>
    </html>
  );
}
