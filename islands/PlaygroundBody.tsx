import { useEffect, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
import LemonIcon from "icons/lemon-2.tsx";
import GithubIcon from "icons/brand-github.tsx";
import IconMountain from "icons/mountain.tsx";

const EXAMPLE_TLA = `
---- MODULE playground ----
EXTENDS Integers

VARIABLES
    \\* @type: Int;
    x,
    \\* @type: Int;
    y


Init == x = 0 /\\ y = 0

Next ==
  \\/ x' = x + 1 /\\ y' = y + 2
  \\/ x' = x + 2 /\\ y' = y + 1

Invariant == x + y < 10

====
`;

export default function PlaygroundBody() {
  const editorRef = useRef(null);
  const invInputRef = useRef(null);

  const consoleText = signal("TLA+ Playground");

  const emptyInv = signal(false);
  const processing = signal(false);

  let editor = null;

  useEffect(() => {
    require.config({
      paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor/min/vs" },
    });

    if (monaco !== undefined) {
      editor = monaco.editor.create(editorRef.current, {
        language: null,
        readOnly: false,
        automaticLayout: true,
        contextmenu: true,
        fontSize: 14,
        lineHeight: 18,
        lineNumbersMinChars: 2,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        scrollbar: {
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        overviewRulerLanes: 0,
      });
    }

    if (window.location.hash) {
      const gistId = window.location.hash.substring(1);
      fetch(`https://api.github.com/gists/${gistId}`)
        .then((value) => value.json())
        .then((json) => {
          editor.setValue(Object.values(json.files)[0].content);
        })
        .catch((error) => {
          console.error(error);
          window.location.hash = "";
          editor.setValue(EXAMPLE_TLA.trimStart());
        });
    } else {
      editor.setValue(EXAMPLE_TLA.trimStart());
    }
  });

  const processText = async () => {
    processing.value = true;
    const data = { tla: editor.getValue(), inv: invInputRef.current.value };
    const resp = await fetch("/api/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const respJson = await resp.json();
    if (respJson.resp.failure) {
      const parsedJson = JSON.parse(respJson.resp.failure.data);
      if (parsedJson.msg) {
        consoleText.value = parsedJson.msg;
      } else {
        consoleText.value = JSON.stringify(
          parsedJson.error_data.counterexamples[0].states.map((e) => {
            delete e["#meta"];
            return e;
          }),
          null,
          2,
        );
      }
    } else {
      consoleText.value = "Verified upto 10 steps";
    }
    processing.value = false;
  };

  const updateInv = (e) => {
    emptyInv.value = e.target.value ? false : true;
  };

  return (
    <div class="flex flex-col h-screen">
      <div class="p-2 flex flex-row items-center gap-3">
        <input
          ref={invInputRef}
          class="rounded py-1 px-4 text-gray-700 ring-1 ring-gray-200 active:ring-2 active:ring-gray-500"
          type="text"
          placeholder="Invariant"
          value="Invariant"
          onChange={updateInv}
          onInput={updateInv}
          disabled={processing}
        />
        <button
          class="rounded px-4 py-1 font-bold text-gray-900 bg-gray-50 ring-1 ring-gray-400 hover:bg-gray-900 hover:text-gray-50 active:ring-gray-700 active:ring-2 disabled:ring-pink-600 disabled:text-pink-600 disabled:hover:bg-pink-600 disabled:hover:ring-0 disabled:hover:text-pink-50 disabled:cursor-not-allowed"
          onClick={processText}
          disabled={emptyInv || processing}
        >
          Check
        </button>
        <div class="flex-grow"></div>

        <div class="flex flex-row divide-x-2 space-x-2 whitespace-pre">
          <div class="flex flex-row">
            <span>Made with {}</span>
            <a
              class="flex flex-row hover:(opacity-70)"
              href="https://apalache.informal.systems"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>Apalache {}</span>
              <IconMountain alt="GitHub logo" />
            </a>
            <span>{} and {}</span>
            <a
              class="flex flex-row hover:(opacity-70)"
              href="https://fresh.deno.dev"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>Fresh {}</span>
              <LemonIcon alt="Fresh logo" />
            </a>
          </div>
          <div class="pl-2">
            <a
              class="flex flex-row hover:(opacity-70)"
              href="https://github.com/rnbguy/fresh_playground"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>View Source {}</span>
              <GithubIcon alt="GitHub logo" />
            </a>
          </div>
        </div>
      </div>
      <div class="flex-grow flex flex-row">
        <div
          class="flex-1"
          ref={editorRef}
        >
        </div>
        <div class="flex-1 whitespace-pre pl-4 font-mono text-sm">
          {consoleText}
        </div>
      </div>
    </div>
  );
}
