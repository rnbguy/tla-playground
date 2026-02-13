export const TLAPlusMonarchLanguage = {
  defaultToken: "",

  keywords: [
    "ASSUME",
    "ASSUMPTION",
    "ACTION",
    "AXIOM",
    "BY",
    "CHOOSE",
    "CONSTANT",
    "CONSTANTS",
    "COROLLARY",
    "DEF",
    "DEFS",
    "DEFINE",
    "DOMAIN",
    "ENABLED",
    "EXCEPT",
    "EXTENDS",
    "HAVE",
    "HIDE",
    "IN",
    "INSTANCE",
    "LAMBDA",
    "LEMMA",
    "LET",
    "LOCAL",
    "MODULE",
    "NEW",
    "OBVIOUS",
    "OMITTED",
    "ONLY",
    "PICK",
    "PROOF",
    "PROPOSITION",
    "PROVE",
    "QED",
    "RECURSIVE",
    "STATE",
    "SUBSET",
    "SUFFICES",
    "TAKE",
    "TEMPORAL",
    "THEOREM",
    "UNCHANGED",
    "UNION",
    "USE",
    "VARIABLE",
    "VARIABLES",
    "WITH",
    "WITNESS",
  ],

  controlKeywords: ["IF", "THEN", "ELSE", "CASE", "OTHER"],

  constants: ["TRUE", "FALSE", "BOOLEAN", "STRING", "Nat", "Int", "Real"],

  operators: [
    "/\\",
    "\\/",
    "~",
    "=>",
    "<=>",
    "=",
    "#",
    "/=",
    "<",
    ">",
    "<=",
    ">=",
    "+",
    "-",
    "*",
    "/",
    "^",
    "<<",
    ">>",
    "~>",
    "-+->",
    "|->",
    "->",
    ":>",
    "<:",
    "::",
    "==",
    "!",
    "?",
  ],

  types: ["Bool", "Str", "Set", "Seq", "Variant"],

  symbols: /[=><!~?:&|+\-*\/\^#\\]+/,

  escapes: /\\[\\"tnfr]/,

  tokenizer: {
    root: [
      { include: "@whitespace" },

      // Module header: ---- MODULE Name ----
      [
        /(-{4,})(\s*MODULE\s*)(\w+)(\s*-{4,})/,
        ["comment", "keyword", "type.identifier", "comment"],
      ],
      // Module footer: ====
      [/={4,}\s*/, "comment"],

      // Apalache type annotations: @type: or @typeAlias:
      [/@@type(?:Alias)?:/, "annotation"],
      // Apalache custom type references: $myType
      [/\$\w+\b/, "type"],

      // Comments (must come before operators to catch \* and (* first)
      [/\\\*/, "comment", "@lineComment"],
      [/\(\*/, "comment", "@blockComment"],

      // Strings
      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

      // Numeric constants (before embedded operators to handle \b, \o, \h prefixes)
      [/\\[bB][01]+/, "number.binary"],
      [/\\[oO][0-7]+/, "number.octal"],
      [/\\[hH][0-9a-fA-F]+/, "number.hex"],
      [/\b\d+\b/, "number"],

      // Embedded backslash operators: \in, \cup, \div, etc.
      [/\\[a-zA-Z]+\b/, "operator"],

      // Fairness operators: SF_expr(action), WF_expr(action)
      [/[SW]F_/, "keyword"],

      // Temporal box operator []
      [/\[\]/, "operator"],

      // Range and ellipsis operators
      [/\.\.\.?/, "operator"],

      // Function merge operator @@ (in Monarch, @@ means literal @, so @@@@ matches @@)
      [/@@@@/, "operator"],

      // EXCEPT @ operator (single @ not followed by another @)
      [/@@(?!@@)/, "operator"],

      // Brackets
      [/[\{\}\(\)\[\]]/, "delimiter.bracket"],
      [/[<>](?!@symbols)/, "delimiter.bracket"],

      // Symbol-sequence operators (check against operators list)
      [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }],

      // Delimiters
      [/[;,.]/, "delimiter"],

      // Instance definitions: Foo == INSTANCE ModName
      [
        /(\w+)(\s*==\s*)(INSTANCE\b)/,
        ["variable", "operator", "keyword"],
      ],
      // Operator/variable definitions: Foo ==
      [/(\w+)(\s*==(?!\s*INSTANCE|==))/, ["variable", "operator"]],
      // Postfix operator definitions: Foo^+ ==
      [
        /(\w+)(\s*(?:\^\+|\^\*|\^#)\s*)(==(?!==))/,
        ["variable", "operator", "operator"],
      ],
      // Binary operator definitions: a \oplus b ==
      [
        /(\w+)(\s*(?:\(?[-<:>=&@\/%#!X\$\*\+\.\|\?\^\\]+\)?|\\[a-z]+)\s+\w+\s*)(==(?!==))/,
        ["variable", "operator", "operator"],
      ],

      // Apalache type constructors: Set(...), Seq(...), Variant(...)
      [/\b(?:Bool|Str|Set|Seq|Variant)\b/, "type"],

      // Operator application: MyOp(arg1, arg2)
      [/\w+\s*(?=\((?!\*))/, "variable"],

      // Module reference prefix: Mod!Op
      [/\b\w+\s*!(?=\w)/, "namespace"],

      // Primed variables: var'
      [/(\b\w+)(')/, ["variable", "operator"]],

      // Prime operator standalone (for cases like (expr)')
      [/'/, "operator"],

      // Keywords and identifiers (catch-all for words)
      [
        /\b\w+\b/,
        {
          cases: {
            "@keywords": "keyword",
            "@controlKeywords": "keyword.control",
            "@constants": "constant",
            "@types": "type",
            "@default": "identifier",
          },
        },
      ],
    ],

    whitespace: [[/[ \t\r\n]+/, "white"]],

    string: [
      [/[^\\"]+/, "string"],
      [/@escapes/, "string.escape"],
      [/\\./, "string.escape.invalid"],
      [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
    ],

    lineComment: [
      [/(?=@@type(?:Alias)?)/, "", "@lineType"],
      [/.$/, "comment", "@pop"],
      [/./, "comment"],
    ],

    lineType: [
      [/(?=.$)/, "", "@pop"],
      { include: "@root" },
    ],

    blockComment: [
      [/\(\*/, "comment", "@push"],
      [/(?=@@type(?:Alias)?)/, "", "@blockType"],
      [/\*\)/, "comment", "@pop"],
      [/./, "comment"],
    ],

    blockType: [
      [/(?=\*\))/, "", "@pop"],
      { include: "@root" },
    ],
  },
};
