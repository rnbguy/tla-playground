import { useEffect, useRef } from "preact/hooks";
import { computed, signal } from "@preact/signals";
import * as yaml from "@std/yaml";

interface PlaygroundProps {
  tla: string;
  invs: string[];
  inv: string;
  out: string;
}

type PingResponse =
  | { status: "ok" }
  | { status: "error"; message?: string; error?: string };
type VerifyResponse = Record<string, unknown>;

type MonacoEditor = {
  getValue: () => string;
  setValue: (value: string) => void;
  addCommand: (keybinding: number, handler: () => void) => void;
  dispose: () => void;
};

type MonacoNamespace = {
  KeyMod: { CtrlCmd: number };
  KeyCode: { Enter: number };
  languages: {
    register: (language: { id: string }) => void;
    setMonarchTokensProvider: (id: string, language: unknown) => void;
  };
  editor: {
    create: (
      element: HTMLElement,
      options: Record<string, unknown>,
    ) => MonacoEditor;
  };
};

type MonacoRequire = {
  config: (config: { paths: { vs: string } }) => void;
  (deps: string[], callback: (monaco: MonacoNamespace) => void): void;
};

let monacoLoaderPromise: Promise<void> | null = null;

function loadMonacoLoader(): Promise<void> {
  if (!monacoLoaderPromise) {
    monacoLoaderPromise = new Promise<void>((resolve, reject) => {
      const runtime = globalThis as unknown as { require?: MonacoRequire };
      if (typeof runtime.require === "function") {
        resolve();
        return;
      }

      if (!document.getElementById("monaco-editor-main-css")) {
        const css = document.createElement("link");
        css.id = "monaco-editor-main-css";
        css.rel = "stylesheet";
        css.href =
          "https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.css";
        document.head.appendChild(css);
      }

      const existingScript = document.getElementById("monaco-loader-script");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Failed to load Monaco loader")),
          {
            once: true,
          },
        );
        return;
      }

      const script = document.createElement("script");
      script.id = "monaco-loader-script";
      script.src =
        "https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/loader.js";
      script.async = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error("Failed to load Monaco loader")),
        {
          once: true,
        },
      );
      document.head.appendChild(script);
    }).catch((error) => {
      monacoLoaderPromise = null;
      throw error;
    });
  }

  return monacoLoaderPromise;
}

function MountainIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="m8 3 4 8 5-5 4 15H3z" />
      <path d="m4 18 5-6 3 4" />
    </svg>
  );
}

function CitrusIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16" />
      <path d="M4 12h16" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3" />
      <path d="M15 22v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.7A5.2 5.2 0 0 0 18.7 5 4.8 4.8 0 0 0 18.6 1s-1.1-.3-3.6 1.4a12.3 12.3 0 0 0-6 0C6.5.7 5.4 1 5.4 1A4.8 4.8 0 0 0 5.3 5 5.2 5.2 0 0 0 4 8.8c0 5.2 3.1 6.4 6.1 6.7a3.4 3.4 0 0 0-.9 2.6V22" />
    </svg>
  );
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
  // defaultToken: "invalid",
  defaultToken: "",

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

  // predefined constants
  constants: ["TRUE", "FALSE", "Nat"],

  // operators
  operators: [
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

  types: [
    "Bool",
    "Int",
    "Str",
    "Set",
    "Seq",
  ],

  // symbols
  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  escapes:
    /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      { include: "@whitespace" },
      // module start
      // ---- MODULE name ----
      [/(-{4,})(\s*MODULE\s*)(\w+)(\s*-{4,})/, [
        "comment",
        "keyword",
        "type.indentifier.class",
        "comment",
      ]],
      // module end
      // ====
      [/={4,}\s*/, "comment"],
      // type def in comment
      // @type, @typeAlias
      [/@@type(Alias)?\:/, "tag.id.pug"],
      // custom types
      // $myType
      [/\$\b\w+\b/, "type"],
      // single line comment
      // \* comment
      [/\\\*/, "comment", "@lineComment"],
      // multi line comment
      // (* comment *)
      [/\(\*/, "comment", "@blockComment"],
      // non-teminated string
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      // string
      [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
      // characters
      [/'[^\\']'/, "string"],
      [/(')(@escapes)(')/, ["string", "string.escape", "string"]],
      [/'/, "string.invalid"],
      // embedded_operators
      // \in \div
      [/\\[a-zA-Z]+\b/, "operator.scss"],
      // brackets
      [/[\{\}\(\)\[\]]/, "delimiter.xml"],
      [/[<>](?!@symbols)/, "delimiter.xml"],
      // symbols operators
      [/[=><!~?:&|+\-*\/\^%\\]+/, { cases: { "@operators": "operator.scss" } }],
      // delimiter
      [/[;,.]/, "delimiter.xml"],
      // numeric_constants
      // 12 b10 o73 h4a
      [
        /(?:\b\d+|\\(?:b|B)[01]+|\\(?:o|O)[0-7]+|\\(?:h|H)[0-9a-fA-F]+)\b/,
        "number.hex",
      ],
      // var_definitions
      //
      [/(\w+)(\s*==(?!\s*INSTANCE|==))/, ["variable", "operator.scss"]],
      // postfix_operator_definitions
      [/(\w+)(\s*\^\+|\^\*|\^#\s*)(==(?!==))/, [
        "variable",
        "operator.sql",
        "operator.scss",
      ]],
      // binary_operator_definitions
      [
        /(\w+)(\s*(\(?[-<:>=&@\/%#!X\$\*\+\.\|\?\^\\]+\)?|\\[a-z]+\s)\s*\w+)\s*==(?!==)/,
        ["variable", "operator.sql", "operator.scss"],
      ],
      // // function_definitions
      // [/(\w+\s*)(\[)(.*(?<!=)==(?!=))/, ["operator", "bracket", "invalid"]],
      // operators
      // MyOperator(arg1, arg2)
      [/\w+\s*(?=\((?!\*))/, "variable"],
      // inst_modules
      [/(\w+)(\s*==\s*)(INSTANCE\b)/, ["variable", "operator.scss", "keyword"]],
      // inst_module_refs
      [/\b\w+\s*!(?=\w)/, "metatag.html"],
      // primed_operators
      // var' = var + 1
      [/(\b\w+)(')/, ["variable", "predefined.sql"]],
      // except_vars
      [/(?<=EXCEPT.*[^@])(@|!)(?!@)/, "predefined.sql"],
      // keywords
      [/\b\w+\b/, {
        cases: {
          "@keywords": "keyword",
          "@controlKeywords": "keyword",
          "@constants": "keyword.json",
          "@types": "type",
          "@default": "identifier",
        },
      }],
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
    ],
    string: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
    ],
    lineComment: [
      [/\\\*/, "comment", "@push"],
      [/(?=@@type(?:Alias)?)/, "comment", "@lineType"],
      [/;$/, "delimiter.xml", "@pop"],
      [/.$/, "comment", "@pop"],
      [/./, "comment"],
    ],
    lineType: [
      [/(?=.$)/, "comment", "@pop"],
      { include: "@root" },
    ],
    blockComment: [
      [/\(\*/, "comment", "@push"],
      [/(?=@@type(?:Alias)?)/, "comment", "@blockType"],
      [/\*\)/, "comment", "@pop"],
      [/./, "comment"],
    ],
    blockType: [
      [/(?=\*\))/, "comment", "@pop"],
      { include: "@root" },
    ],
  },
};

export default function PlaygroundBody(props: PlaygroundProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editor = useRef<MonacoEditor | null>(null);
  const pollingTimerRef = useRef<number | null>(null);

  const loadingText = signal("");
  const consoleText = signal("");
  const errorText = signal("");

  const selectedInv = signal("");
  const allInvs = signal<string[]>([]);

  const allInvsOption = computed(() => {
    const options = [
      <option
        key="placeholder"
        value=""
        disabled
        selected={!(allInvs.value && allInvs.value.includes(selectedInv.value))}
      >
        Select an invariant
      </option>,
    ];

    if (allInvs.value && allInvs.value.length > 0) {
      options.push(
        ...allInvs.value.map((inv) => (
          <option value={inv} key={inv}>
            {inv}
          </option>
        )),
      );
    }

    return options;
  });
  useEffect(() => {
    let isDisposed = false;

    let initTla: PlaygroundProps = props;
    const rawStoredSnippet = localStorage.getItem("tla-snippet");
    if (rawStoredSnippet) {
      try {
        const parsed = JSON.parse(rawStoredSnippet) as PlaygroundProps;
        if (parsed.tla.length > 0) {
          initTla = parsed;
        }
      } catch {
        initTla = props;
      }
    }

    consoleText.value = initTla.out;

    void loadMonacoLoader().then(() => {
      if (isDisposed) {
        return;
      }

      const runtime = globalThis as unknown as { require?: MonacoRequire };
      if (typeof runtime.require !== "function") {
        errorText.value = "> Monaco loader not available";
        return;
      }

      runtime.require.config({
        paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor/min/vs" },
      });

      runtime.require(
        ["vs/editor/editor.main"],
        function (monaco: MonacoNamespace) {
          if (isDisposed || !editorRef.current) {
            return;
          }

          monaco.languages.register({ id: "tla" });

          monaco.languages.setMonarchTokensProvider(
            "tla",
            TLAPlusMonarchLanguage,
          );

          editor.current = monaco.editor.create(editorRef.current, {
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

          if (globalThis.location.hash) {
            const gistId = globalThis.location.hash.substring(1);
            fetch(`https://api.github.com/gists/${gistId}`, {
              signal: AbortSignal.timeout(4000),
            })
              .then((value) => value.json())
              .then((json) => {
                const firstFile = Object.values(json.files)[0] as {
                  content?: string;
                };
                editor.current?.setValue(
                  firstFile.content ?? initTla.tla.trimStart(),
                );
              })
              .catch((error) => {
                console.error(error);
                globalThis.location.hash = "";
                editor.current?.setValue(initTla.tla.trimStart());
              });
          } else {
            editor.current.setValue(initTla.tla.trimStart());
          }

          editor.current.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            processText,
          );

          allInvs.value = initTla.invs;
          selectedInv.value = initTla.inv;

          pollingTimerRef.current = globalThis.setInterval(async () => {
            const currentEditor = editor.current;
            if (!currentEditor) {
              return;
            }

            const tla = currentEditor.getValue();
            const storedSnippet = localStorage.getItem("tla-snippet");
            const storedTla = storedSnippet
              ? JSON.parse(storedSnippet) as { tla?: string }
              : null;

            if (storedTla && storedTla.tla !== tla) {
              const invariants = await tlaInvariants({ tla });

              allInvs.value = invariants;

              if (!invariants.includes(selectedInv.value)) {
                selectedInv.value = invariants[invariants.length - 1] ?? "";
              }

              localStorage.setItem(
                "tla-snippet",
                JSON.stringify({
                  tla,
                  invs: allInvs.value,
                  inv: selectedInv.value,
                  out: consoleText.value,
                }),
              );
            }
          }, 5000);
        },
      );
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      errorText.value = `> ${message}`;
    });

    return () => {
      isDisposed = true;
      if (pollingTimerRef.current !== null) {
        globalThis.clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      editor.current?.dispose();
      editor.current = null;
    };
  }, []);

  async function ping(): Promise<PingResponse> {
    try {
      return await fetch("/api/ping", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }).then((resp) => resp.json() as Promise<PingResponse>);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async function tlaInvariants(data: { tla: string }): Promise<string[]> {
    try {
      return await fetch("/api/invariants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((resp) => resp.json());
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async function tlaVerify(
    data: { tla: string; inv: string },
  ): Promise<VerifyResponse> {
    try {
      return await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((resp) => resp.json() as Promise<VerifyResponse>);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  const processText = async () => {
    const currentEditor = editor.current;
    if (!currentEditor) {
      return;
    }

    const tla = currentEditor.getValue();

    const pingResp = await ping();
    if (pingResp.status !== "ok") {
      consoleText.value = "";
      errorText.value = "> Apalache server is down !";
      return;
    }

    const invariants = await tlaInvariants({ tla });

    allInvs.value = invariants;

    if (invariants.includes(selectedInv.value)) {
      // const spinner = new Spinner(["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]);
      const spinner = new Spinner(["...", " ..", ". .", ".. "]);
      errorText.value = "";
      consoleText.value = "";

      const spinnerTimer = globalThis.setInterval(() => {
        loadingText.value = `> processing ${spinner.next()}`;
      }, 200);
      consoleText.value = "";
      const data = { tla, inv: selectedInv.value };
      const respJson = await tlaVerify(data);

      globalThis.clearInterval(spinnerTimer);
      loadingText.value = "";

      consoleText.value = yaml.stringify(respJson, { indent: 2 });
    }
  };

  return (
    <div class="flex flex-col h-screen">
      <div class="p-2 flex flex-row items-center gap-3">
        <select
          value={selectedInv.value}
          class="rounded py-1 px-4 text-gray-700 ring-1 ring-gray-200 active:ring-2 active:ring-gray-500"
          onChange={(e) => {
            selectedInv.value = e.currentTarget.value;
          }}
        >
          {allInvsOption}
        </select>
        <button
          type="button"
          class="rounded px-4 py-1 font-bold text-gray-900 bg-gray-50 ring-1 ring-gray-400 hover:bg-gray-900 hover:text-gray-50 active:ring-gray-700 active:ring-2"
          onClick={processText}
        >
          Verify
        </button>
        <div class="flex-grow"></div>

        <div class="flex flex-row divide-x-2 space-x-2 whitespace-pre">
          <div class="flex flex-row">
            <span>Made with</span>
            <a
              class="flex flex-row hover:(opacity-70)"
              href="https://apalache.informal.systems"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>Apalache</span>
              <MountainIcon />
            </a>
            <span>and</span>
            <a
              class="flex flex-row hover:(opacity-70)"
              href="https://fresh.deno.dev"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>Fresh</span>
              <CitrusIcon />
            </a>
          </div>
          <div class="pl-2">
            <a
              class="flex flex-row hover:(opacity-70)"
              href="https://github.com/rnbguy/fresh-playground"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>View Source</span>
              <GithubIcon />
            </a>
          </div>
        </div>
      </div>
      <div class="min-h-screen min-w-screen flex flex-col md:flex-row">
        <div
          class="flex-1"
          ref={editorRef}
        >
        </div>
        <div class="flex-1 overflow-auto whitespace-pre pl-4 font-mono text-sm">
          {loadingText}
          {consoleText}
          {errorText}
        </div>
      </div>
    </div>
  );
}
