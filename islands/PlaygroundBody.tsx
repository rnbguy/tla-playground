import { useEffect, useRef } from "preact/hooks";
import { computed, signal } from "@preact/signals";
import { Citrus, Github, Mountain } from "npm:lucide-preact@^0.542.0";
import * as yaml from "@std/yaml";

interface PlaygroundProps {
  tla: string;
  invs: string[];
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
  const editorRef = useRef(null);

  const loadingText = signal("");
  const consoleText = signal("");
  const errorText = signal("");

  const selectedInv = signal("");
  const allInvs = signal([]);

  const allInvsOption = computed(() => {
    const options = [
      <option
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
          <option value={inv} selected={selectedInv.value === inv}>
            {inv}
          </option>
        )),
      );
    }

    return options;
  });

  let editor = null;

  useEffect(() => {
    let initTla = JSON.parse(localStorage.getItem("tla-snippet")!) ?? props;
    if (initTla.tla.length === 0) {
      initTla = props;
    }

    consoleText.value = initTla.out;

    require.config({
      paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor/min/vs" },
    });

    require(
      ["vs/editor/editor.main"],
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

        if (globalThis.location.hash) {
          const gistId = globalThis.location.hash.substring(1);
          fetch(`https://api.github.com/gists/${gistId}`)
            .then((value) => value.json())
            .then((json) => {
              editor.setValue(Object.values(json.files)[0].content);
            })
            .catch((error) => {
              console.error(error);
              globalThis.location.hash = "";
              editor.setValue(initTla.tla.trimStart());
            });
        } else {
          editor.setValue(initTla.tla.trimStart());
        }
        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          processText,
        );

        allInvs.value = initTla.invs;
        selectedInv.value = initTla.inv;

        setInterval(async () => {
          const tla = editor.getValue();

          const storedTla = JSON.parse(localStorage.getItem("tla-snippet")!);

          if (storedTla && storedTla.tla !== tla) {
            const invariants = await tlaInvariants({ tla });

            allInvs.value = invariants;

            if (!invariants.includes(selectedInv.value)) {
              selectedInv.value = invariants[invariants.length - 1];
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
        }, 2000);
      },
    );
  });

  async function ping(): Promise<any> {
    try {
      return await fetch("/ping", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }).then((resp) => resp.json());
    } catch (error) {
      return { error: error.message };
    }
  }

  async function tlaInvariants(data: { tla: string }): Promise<string[]> {
    try {
      return await fetch("/invariants", {
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
  ): Promise<any> {
    try {
      return await fetch("/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((resp) => resp.json());
    } catch (error) {
      return { error: error.message };
    }
  }

  const processText = async () => {
    const tla = editor.getValue();

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

      const spinnerTimer = setInterval(
        function x() {
          loadingText.value = `> processing ${spinner.next()}`;
          return x;
        }(),
        100,
      );
      consoleText.value = "";
      const data = { tla, inv: selectedInv.value };
      const respJson = await tlaVerify(data);

      clearInterval(spinnerTimer);
      loadingText.value = "";

      consoleText.value = yaml.stringify(respJson, { indent: 2 });
    }
  };

  return (
    <div class="flex flex-col h-screen">
      <div class="p-2 flex flex-row items-center gap-3">
        <select
          class="rounded py-1 px-4 text-gray-700 ring-1 ring-gray-200 active:ring-2 active:ring-gray-500"
          onChange={(e) => selectedInv.value = e.target.value}
        >
          {allInvsOption}
        </select>
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
              <Mountain size={16} strokeWidth={2} />
            </a>
            <span>{} and {}</span>
            <a
              class="flex flex-row hover:(opacity-70)"
              href="https://fresh.deno.dev"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>Fresh {}</span>
              <Citrus size={16} strokeWidth={2} />
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
              <Github size={16} strokeWidth={2} />
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
