export const TLAPlusMonarchLanguage = {
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
