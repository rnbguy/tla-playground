import { Button } from "../components/Button.tsx";
import { useEffect, useRef, useState } from "preact/hooks";
import { computed, signal } from "@preact/signals";
import { asset, IS_BROWSER } from "$fresh/runtime.ts";

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

const EXAMPLE_TLA = `
---- MODULE hello ----
EXTENDS Integers

VARIABLE
    \\* @type: Int;
    x

Init == x = 0

Next == x' = x + 1 \\/ x' = x + 5

Inv == x < 3

View == x

====
`;

export default function Run() {
  const editorRef = useRef(null);
  const consoleText = signal("Click run to run..");
  const buttonDisabled = signal(false);

  let editor = null;

  useEffect(() => {
    if (IS_BROWSER) {
      require.config({
        paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor/min/vs" },
      });

      if (monaco !== undefined) {
        editor = monaco.editor.create(editorRef.current, {
          value: EXAMPLE_TLA.trimStart(),
          language: "javascript",
        });
      }
    }
  });

  const processText = async () => {
    buttonDisabled.value = true;
    const txt = editor.getValue();
    const data = { "body": txt };
    const resp = await fetch("/api/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    consoleText.value = JSON.stringify(
      JSON.parse((await resp.json()).resp.failure.data),
      null,
      2,
    );
    console.log(consoleText.value);
    buttonDisabled.value = false;
  };

  return (
    <div class="gap-2 w-full place-items-center">
      <div
        ref={editorRef}
        class="rounded min-w-full min-h-[30rem] overflow-x-auto bg-gray-100"
      />

      <Button
        disabled={buttonDisabled}
        onClick={processText}
      >
        Run
      </Button>

      <p class="rounded min-w-full min-h-[30rem] p-[1em] overflow-x-auto bg-gray-100 font-mono text-sm whitespace-pre">
        {consoleText}
      </p>
    </div>
  );
}
