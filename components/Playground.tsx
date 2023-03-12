import { Head } from "$fresh/runtime.ts";
import PlaygroundBody from "../islands/PlaygroundBody.tsx";

export default function Playground() {
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
        <PlaygroundBody />
      </body>
    </html>
  );
}
