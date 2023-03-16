import { useEffect, useRef } from "preact/hooks";
import { computed, signal } from "@preact/signals";
import LemonIcon from "icons/lemon-2.tsx";
import GithubIcon from "icons/brand-github.tsx";
import IconMountain from "icons/mountain.tsx";
import * as yaml from "$std/encoding/yaml.ts";

interface PlaygroundProps {
  tla: string;
  inv: string;
  out: string;
}

class Spinner {
  #chars: Array<string>;
  #index: number;
  constructor(chars: Array<string>) {
    this.#chars = chars;
    this.#index = 0;
  }
  next(): string {
    const rt = this.#chars[this.#index];
    this.#index = (this.#index + 1) % this.#chars.length;
    return rt;
  }
}

const TLAPlusMonarchLanguage = {
  defaultToken: "invalid",

  // keywords
  keywords: [
    "EXTENDS",
    "VARIABLE",
    "VARIABLES",
    "LET",
    "IN",
    "EXCEPT",
    "ENABLED",
    "UNCHANGED",
    "LAMBDA",
    "DOMAIN",
    "CONSTANT",
    "CONSTANTS",
    "CHOOSE",
    "LOCAL",
    "ASSUME",
    "ASSUMPTION",
    "AXIOM",
    "RECURSIVE",
    "INSTANCE",
    "WITH",
    "THEOREM",
    "SUBSET",
    "UNION",
    "SF_",
    "WF_",
    "USE",
    "DEFS",
    "BY",
    "DEF",
    "SUFFICES",
    "PROVE",
    "OBVIOUS",
    "NEW",
    "QED",
    "RECURSIVE",
    "PICK",
    "HIDE",
    "DEFINE",
    "WITNESS",
    "HAVE",
    "TAKE",
    "PROOF",
    "ACTION",
    "COROLLARY",
    "LEMMA",
    "OMITTED",
    "ONLY",
    "PROPOSITION",
    "STATE",
    "TEMPORAL",
  ],
  // control_keywords
  controlKeywords: ["IF", "THEN", "ELSE", "CASE", "OTHER"],
  // constants
  constants: ["TRUE", "FALSE"],
  //symbols
  symbols: [
    "/\\",
    "\\/",
    "=",
    ">",
    "<",
    "!",
    "~",
    "?",
    ":",
    "==",
    "<=",
    ">=",
    "!=",
    "&&",
    "||",
    "++",
    "--",
    "+",
    "-",
    "*",
    "/",
    "&",
    "|",
    "^",
    "%",
    "<<",
    ">>",
    ">>>",
    "+=",
    "-=",
    "*=",
    "/=",
    "&=",
    "|=",
    "^=",
    "%=",
    "<<=",
    ">>=",
    ">>>=",
  ],

  tokenizer: {
    root: [
      { include: "@whitespace" },
      // module start
      [/(-{4,})(\s*MODULE\s*)(\w+)(\s*-{4,})/, [
        "comment",
        "keyword",
        "type.indentifier.class",
        "comment",
      ]],
      // module end
      [/={4,}\\s*/, "comment"],
      // embedded_operators
      [/\\[a-zA-Z]+\b/, "operator"],
      // numeric_constants
      [
        /(?:\b\d+|\\(?:b|B)[01]+|\\(?:o|O)[0-7]+|\\(?:h|H)[0-9a-fA-F]+)\b/,
        "constant",
      ],
      // var_definitions
      [/(\w+)(\s*==(?!\s*INSTANCE|==))/, ["variable", "operator"]],
      // postfix_operator_definitions
      [/(\w+)(\s*\^\+|\^\*|\^#\s*)(==(?!==))/, [
        "variable",
        "operator",
        "operator",
      ]],
      // binary_operator_definitions
      [
        /(\w+\s*(\(?[-<:>=&@\/%#!X\$\*\+\.\|\?\^\\]+\)?|\\[a-z]+\s)\s*\w+)\s*==(?!==)/,
        ["variable", "operator"],
      ],
      // function_definitions
      [/(\w+\s*)(\[)(.*(?<!=)==(?!=))/, ["operator", "bracket", "invalid"]],
      // operators
      [/(\w+\s*)(\()(?!\*)/, ["operator", "bracket", "invalid"]],
      // inst_modules
      [/(\w+)(\s*==\s*)(INSTANCE\b)/, ["variable", "operator", "keyword"]],
      // inst_module_refs
      [/\b\w+\s*!(?=\w)/, "entity"],
      // primed_operators
      [/\b\w+'/, "variable"],
      // symbols
      // except_vars
      [/(?<=EXCEPT.*[^@])(@|!)(?!@)/, "variable"],
      [/\\\*.*$/, "comment"],
      [/(?:\(\*)/, "comment", "@blockComment"],
      [/[=><!~?:&|+\-*\/\^%\\]+/, { cases: { "@symbols": "operator" } }],
      { include: "@string" },
      [/\b\w+\b/, {
        cases: {
          "@keywords": "keyword",
          "@controlKeywords": "keyword",
          "@constants": "constant",
        },
      }],
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
    ],
    string: [
      [/[^\"]+/, "string"],
      [/\\"/, "string.escape"],
      [/"/, "string", "@pop"],
    ],
    blockComment: [
      [/\(\*/, "comment", "@push"],
      [/\*\)/, "comment", "@pop"],
      [/./, "comment"],
    ],
  },
};

export default function PlaygroundBody(props: PlaygroundProps) {
  const editorRef = useRef(null);
  const invInputRef = useRef(null);

  const loadingText = signal("");
  const consoleText = signal("");

  const emptyInv = signal(false);
  const processing = signal(false);
  const processDisabled = computed(() => emptyInv.value || processing.value);

  let editor = null;

  useEffect(() => {
    let initTla = JSON.parse(localStorage.getItem("tla-snippet")) ?? props;
    if (initTla.tla.length === 0) {
      initTla = props;
    }

    consoleText.value = initTla.out;

    require.config({
      paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor/min/vs" },
    });

    require(
      ["vs/editor/editor.main", "vs/editor/editor.main.nls"],
      function (monaco) {
        monaco.languages.register({ id: "tla" });

        monaco.languages.setMonarchTokensProvider(
          "tla",
          TLAPlusMonarchLanguage,
        );

        editor = monaco.editor.create(editorRef.current, {
          language: "tla",
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
              editor.setValue(initTla.tla.trimStart());
              invInputRef.current.value = initTla.inv;
            });
        } else {
          editor.setValue(initTla.tla.trimStart());
          invInputRef.current.value = initTla.inv;
        }
        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          processText,
        );

        setInterval(() => {
          localStorage.setItem(
            "tla-snippet",
            JSON.stringify({
              tla: editor.getValue(),
              inv: invInputRef.current.value,
              out: consoleText.value,
            }),
          );
        }, 2000);
      },
    );
  });

  const processText = async () => {
    if (!processDisabled.value) {
      processing.value = true;

      // const spinner = new Spinner(["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]);
      const spinner = new Spinner(["...", " ..", ". .", ".. "]);
      consoleText.value = "";

      const spinnerTimer = setInterval(() => {
        loadingText.value = `> processing ${spinner.next()}`;
      }, 100);
      consoleText.value = "";
      const data = { tla: editor.getValue(), inv: invInputRef.current.value };
      const resp = await fetch("/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const respJson = await resp.json();

      clearInterval(spinnerTimer);
      loadingText.value = "";

      consoleText.value = yaml.stringify(respJson, { indent: 2 });
      processing.value = false;
    }
  };

  const updateInv = (e) => {
    emptyInv.value = !e.target.value;
  };

  return (
    <div class="flex flex-col h-screen">
      <div class="p-2 flex flex-row items-center gap-3">
        <input
          ref={invInputRef}
          class="rounded py-1 px-4 text-gray-700 ring-1 ring-gray-200 active:ring-2 active:ring-gray-500"
          type="text"
          placeholder="Enter invariant name"
          onChange={updateInv}
          onInput={updateInv}
        />
        <button
          class="rounded px-4 py-1 font-bold text-gray-900 bg-gray-50 ring-1 ring-gray-400 hover:bg-gray-900 hover:text-gray-50 active:ring-gray-700 active:ring-2"
          onClick={processText}
        >
          Verify
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
              href="https://github.com/rnbguy/fresh-playground"
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
          {loadingText}
          {consoleText}
        </div>
      </div>
    </div>
  );
}
