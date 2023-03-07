import { Button } from "../components/Button.tsx";
import { useEffect, useRef, useState } from "preact/hooks";
import { computed, signal } from "@preact/signals";
import { IS_BROWSER } from "$fresh/runtime.ts";

// interface RunProps {
//   editor: monacoEditor.IStandaloneCodeEditor;
// }

// function createEditor() {
//   const el = window.document.getElementById(monacoId);
//   const editor = monacoEditor.create(el as HTMLElement, {
//     readOnly: true,
//     automaticLayout: true,
//     contextmenu: true,
//     fontSize: 14,
//     lineHeight: 18,
//     lineNumbersMinChars: 2,
//     minimap: { enabled: false },
//     scrollBeyondLastLine: false,
//     smoothScrolling: true,
//     scrollbar: {
//       useShadows: false,
//       verticalScrollbarSize: 10,
//       horizontalScrollbarSize: 10,
//     },
//     overviewRulerLanes: 0,
//   });
//   const model = monacoEditor.createModel(
//     `// Monaco Editor x Aleph.js (SPA mode) \n\nconsole.log("Hello, world!");\n`,
//     "typescript",
//   );
//   el!.innerHTML = "";
//   editor.setModel(model);
//   return editor;
// }

if (IS_BROWSER) {
  // await import("https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/loader.js");
  // await import(
  //   "https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.nls.js"
  // );
  // await import("https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.js");
}

export default function Run() {
  const editorRef = useRef(null);
  const consoleText = signal("Click run to run..");
  const revText = computed(() =>
    consoleText.value.split("").reverse().join("")
  );

  let editor = null;

  useEffect(() => {
    if (IS_BROWSER) {
      require.config({
        paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor/min/vs" },
      });

      if (monaco !== undefined) {
        editor = monaco.editor.create(editorRef.current, {
          value: ["function x() {", '\tconsole.log("Hello world!");', "}"].join(
            "\n",
          ),
          language: "javascript",
        });
      }
    }
  });

  return (
    <div class="gap-2 w-full place-items-center">
      <div
        ref={editorRef}
        class="rounded min-w-full min-h-[30rem] overflow-x-auto bg-gray-100"
      />

      <Button
        onClick={() => {
          consoleText.value = editor.getValue();
        }}
      >
        Run
      </Button>

      <div class="rounded min-w-full min-h-[30rem] p-[1em] overflow-x-auto bg-gray-100">
        {revText}
      </div>

      <link
        rel="stylesheet"
        data-name="vs/editor/editor.main"
        href="https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.css"
      />

      <script src="https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/loader.js" />
      <script src="https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.nls.js" />
      <script src="https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.js" />
    </div>
  );
}
