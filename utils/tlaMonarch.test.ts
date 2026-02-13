import { assertEquals, assert } from "@std/assert";
import { TLAPlusMonarchLanguage } from "./tlaMonarch.ts";

// Uses Monaco Editor's actual Monarch compiler and tokenizer.
// monarchCompile + monarchLexer work in Deno without a DOM.
import { compile } from "monaco-editor/esm/vs/editor/standalone/common/monarch/monarchCompile.js";
import { MonarchTokenizer } from "monaco-editor/esm/vs/editor/standalone/common/monarch/monarchLexer.js";

// deno-lint-ignore no-explicit-any
const lang = TLAPlusMonarchLanguage as any;
// deno-lint-ignore no-explicit-any
const lexer = compile("tla", lang) as any;

// MonarchTokenizer needs minimal service mocks (no DOM required).
// deno-lint-ignore no-explicit-any
const tokenizer = new (MonarchTokenizer as any)(
  null, // languageService (unused for classic tokenize)
  null, // standaloneThemeService (unused for classic tokenize)
  "tla",
  lexer,
  // configurationService mock
  {
    getValue: () => 20000,
    onDidChangeConfiguration: () => ({ dispose() {} }),
  },
);

// deno-lint-ignore no-explicit-any
function tokenizeLine(line: string, state: any) {
  return tokenizer.tokenize(line, true, state);
}

// deno-lint-ignore no-explicit-any
function getInitialState(): any {
  return tokenizer.getInitialState();
}

// ======================== Helpers ========================

const artifactsDir = `${import.meta.dirname}/testArtifacts`;
function readArtifact(name: string): string {
  return Deno.readTextFileSync(`${artifactsDir}/${name}`);
}

interface SimpleToken {
  value: string;
  type: string;
}

function tokenize(code: string): SimpleToken[] {
  const lines = code.split("\n");
  let state = getInitialState();
  const allTokens: SimpleToken[] = [];

  for (const line of lines) {
    const result = tokenizeLine(line, state);

    for (let j = 0; j < result.tokens.length; j++) {
      const tok = result.tokens[j];
      const nextOffset = j + 1 < result.tokens.length
        ? result.tokens[j + 1].offset
        : line.length;
      const value = line.substring(tok.offset, nextOffset);
      if (value.length > 0) {
        allTokens.push({ value, type: tok.type });
      }
    }

    state = result.endState;
  }
  return allTokens;
}

function findTokens(tokens: SimpleToken[], value: string): SimpleToken[] {
  return tokens.filter((t) => t.value === value);
}

function findToken(
  tokens: SimpleToken[],
  value: string,
): SimpleToken | undefined {
  return tokens.find((t) => t.value === value);
}

// Monaco appends ".tla" suffix to all token types (tokenPostfix).
function assertTokenType(
  tokens: SimpleToken[],
  value: string,
  expectedBase: string,
) {
  const tok = findToken(tokens, value);
  assert(tok, `"${value}" should be tokenized`);
  assertEquals(
    tok!.type,
    expectedBase + ".tla",
    `"${value}" should have type "${expectedBase}"`,
  );
}

// ======================== Grammar structure tests ========================

Deno.test("grammar compiles without errors", () => {
  assert(lexer, "Lexer should compile");
  assertEquals(lexer.languageId, "tla");
  assert(lexer.tokenizer.root, "should have root state");
  assert(lexer.tokenizer.string, "should have string state");
  assert(lexer.tokenizer.lineComment, "should have lineComment state");
  assert(lexer.tokenizer.blockComment, "should have blockComment state");
});

Deno.test("keywords list has no duplicates", () => {
  const keywords = lang.keywords as string[];
  const unique = new Set(keywords);
  assertEquals(
    keywords.length,
    unique.size,
    `Duplicate keywords: ${keywords.filter((k: string, i: number) => keywords.indexOf(k) !== i)}`,
  );
});

Deno.test("SF_ and WF_ are not in keywords list", () => {
  assert(!lang.keywords.includes("SF_"), "SF_ should not be a keyword");
  assert(!lang.keywords.includes("WF_"), "WF_ should not be a keyword");
});

Deno.test("MODULE is in keywords list", () => {
  assert(lang.keywords.includes("MODULE"));
});

Deno.test("operators list contains only valid TLA+ operators", () => {
  const invalidOps = [
    ">>>", "+=", "-=", "*=", "&=", "|=", "^=", "%=", "<<=", ">>=", ">>>=",
    "&&", "||", "++", "--",
  ];
  for (const op of invalidOps) {
    assert(!lang.operators.includes(op), `${op} is not a valid TLA+ operator`);
  }
});

Deno.test("operators list contains essential TLA+ operators", () => {
  for (const op of [
    "/\\", "\\/", "=>", "<=>", "~>", "|->", "->", ":>", "<:", "#", "==",
  ]) {
    assert(lang.operators.includes(op), `${op} should be in operators list`);
  }
});

Deno.test("constants include BOOLEAN and STRING", () => {
  for (const c of ["TRUE", "FALSE", "BOOLEAN", "STRING", "Nat"]) {
    assert(lang.constants.includes(c), `${c} should be in constants`);
  }
});

Deno.test("types include Apalache types", () => {
  for (const t of ["Bool", "Str", "Set", "Seq", "Variant"]) {
    assert(lang.types.includes(t), `${t} should be in types`);
  }
});

Deno.test("escape regex only matches TLA+ escapes", () => {
  const escapes = lang.escapes as RegExp;
  assert(escapes.test("\\\\"), "should match \\\\");
  assert(escapes.test('\\"'), 'should match \\"');
  assert(escapes.test("\\t"), "should match \\t");
  assert(escapes.test("\\n"), "should match \\n");
  assert(escapes.test("\\f"), "should match \\f");
  assert(escapes.test("\\r"), "should match \\r");
  assert(!escapes.test("\\a"), "should not match \\a");
  assert(!escapes.test("\\b"), "should not match \\b");
  assert(!escapes.test("\\v"), "should not match \\v");
  assert(!escapes.test("\\x41"), "should not match \\x");
  assert(!escapes.test("\\u0041"), "should not match \\u");
});

Deno.test("no token class names with .scss, .xml, .pug, .html, .sql, .json suffixes", () => {
  const badSuffixes = [".scss", ".xml", ".pug", ".html", ".sql", ".json"];
  const allTokenStrings: string[] = [];

  function collect(obj: unknown): void {
    if (typeof obj === "string") allTokenStrings.push(obj);
    else if (Array.isArray(obj)) obj.forEach(collect);
    else if (obj && typeof obj === "object") Object.values(obj).forEach(collect);
  }
  collect(lang.tokenizer);

  for (const tokenStr of allTokenStrings) {
    for (const suffix of badSuffixes) {
      assert(
        !tokenStr.endsWith(suffix),
        `Token "${tokenStr}" should not use ${suffix} suffix`,
      );
    }
  }
});

Deno.test("no typo 'indentifier' in token classes", () => {
  assert(!JSON.stringify(lang.tokenizer).includes("indentifier"));
});

// ======================== Tokenization tests ========================

Deno.test("tokenize module header", () => {
  const tokens = tokenize("---- MODULE Test ----");
  assertTokenType(tokens, " MODULE ", "keyword");
  assertTokenType(tokens, "Test", "type.identifier");
});

Deno.test("tokenize module footer", () => {
  const tokens = tokenize("====");
  assert(tokens.length > 0);
  assertEquals(tokens[0].type, "comment.tla");
});

Deno.test("tokenize TLA+ keywords", () => {
  const tokens = tokenize("EXTENDS Integers VARIABLE x CONSTANT N");
  assertTokenType(tokens, "EXTENDS", "keyword");
  assertTokenType(tokens, "VARIABLE", "keyword");
  assertTokenType(tokens, "CONSTANT", "keyword");
});

Deno.test("tokenize control keywords", () => {
  const tokens = tokenize("IF x THEN y ELSE z");
  assertTokenType(tokens, "IF", "keyword.control");
  assertTokenType(tokens, "THEN", "keyword.control");
  assertTokenType(tokens, "ELSE", "keyword.control");
});

Deno.test("tokenize boolean constants", () => {
  const tokens = tokenize("x = TRUE /\\ y = FALSE");
  assertTokenType(tokens, "TRUE", "constant");
  assertTokenType(tokens, "FALSE", "constant");
});

Deno.test("tokenize BOOLEAN and STRING constants", () => {
  const tokens = tokenize("x \\in BOOLEAN /\\ y \\in STRING");
  assertTokenType(tokens, "BOOLEAN", "constant");
  assertTokenType(tokens, "STRING", "constant");
});

Deno.test("tokenize operator definition", () => {
  assertTokenType(tokenize("Init == x = 0"), "Init", "variable");
});

Deno.test("tokenize primed variable", () => {
  const tokens = tokenize("x' = x + 1");
  assertTokenType(tokens, "'", "operator");
  assertEquals(
    tokens.filter((t) => t.type.startsWith("string.invalid")).length,
    0,
  );
});

Deno.test("tokenize backslash operators", () => {
  const tokens = tokenize("x \\in S \\cup T \\subseteq U");
  assertTokenType(tokens, "\\in", "operator");
  assertTokenType(tokens, "\\cup", "operator");
  assertTokenType(tokens, "\\subseteq", "operator");
});

Deno.test("tokenize decimal numbers", () => {
  assertTokenType(tokenize("x = 42"), "42", "number");
});

Deno.test("tokenize binary numbers", () => {
  assertTokenType(tokenize("x = \\b1010"), "\\b1010", "number.binary");
});

Deno.test("tokenize octal numbers", () => {
  assertTokenType(tokenize("x = \\o17"), "\\o17", "number.octal");
});

Deno.test("tokenize hex numbers", () => {
  assertTokenType(tokenize("x = \\hFF"), "\\hFF", "number.hex");
});

Deno.test("tokenize strings", () => {
  const tokens = tokenize('"hello world"');
  assert(tokens.some((t) => t.type === "string.quote.tla"));
  assert(tokens.some((t) => t.type === "string.tla"));
});

Deno.test("tokenize string with escape", () => {
  const tokens = tokenize('"hello\\nworld"');
  assert(
    tokens.some((t) => t.type === "string.escape.tla"),
    "should have string.escape token",
  );
});

Deno.test("tokenize line comment", () => {
  const tokens = tokenize("\\* this is a comment");
  assert(
    tokens.every((t) => t.type === "comment.tla"),
    "all tokens should be comment",
  );
});

Deno.test("tokenize block comment", () => {
  const tokens = tokenize("(* this is a comment *)");
  assert(
    tokens.every((t) => t.type === "comment.tla"),
    "all tokens should be comment",
  );
});

Deno.test("tokenize INSTANCE definition", () => {
  const tokens = tokenize("Foo == INSTANCE Bar");
  assertTokenType(tokens, "Foo", "variable");
  assertTokenType(tokens, "INSTANCE", "keyword");
});

Deno.test("tokenize WF_ fairness operator", () => {
  assertTokenType(tokenize("WF_vars(Next)"), "WF_", "keyword");
});

Deno.test("tokenize SF_ fairness operator", () => {
  assertTokenType(tokenize("SF_vars(Next)"), "SF_", "keyword");
});

Deno.test("tokenize range operator ..", () => {
  assertTokenType(tokenize("1 .. N"), "..", "operator");
});

Deno.test("tokenize function merge @@", () => {
  assertTokenType(tokenize("f @@ g"), "@@", "operator");
});

Deno.test("tokenize EXCEPT @ operator", () => {
  const tokens = tokenize("[f EXCEPT ![x] = @]");
  const atTokens = findTokens(tokens, "@");
  assert(atTokens.length > 0, "@ should be tokenized");
  assertEquals(atTokens[0].type, "operator.tla");
});

Deno.test("tokenize module reference Mod!Op", () => {
  const tokens = tokenize("Mod!Op");
  assert(
    tokens.some((t) => t.type === "namespace.tla"),
    "should have namespace token",
  );
});

Deno.test("tokenize Apalache type annotation in block comment", () => {
  assertTokenType(tokenize("(* @type: Int; *)"), "@type:", "annotation");
});

Deno.test("tokenize Apalache typeAlias in block comment", () => {
  assertTokenType(
    tokenize("(* @typeAlias: myType = Set(Int); *)"),
    "@typeAlias:",
    "annotation",
  );
});

Deno.test("tokenize Apalache custom type reference $myType", () => {
  assertTokenType(tokenize("$myType"), "$myType", "type");
});

Deno.test("tokenize Apalache type keywords", () => {
  assertTokenType(tokenize("Set"), "Set", "type");
  assertTokenType(tokenize("Seq"), "Seq", "type");
  assertTokenType(tokenize("Bool"), "Bool", "type");
  assertTokenType(tokenize("Variant"), "Variant", "type");
});

Deno.test("tokenize temporal box operator []", () => {
  assertTokenType(tokenize("[]<>(x = 1)"), "[]", "operator");
});

Deno.test("standalone prime is operator, not string.invalid", () => {
  const tokens = tokenize("'");
  assert(tokens.length > 0);
  assertEquals(tokens[0].type, "operator.tla");
});

// ======================== Real-world TLA+ specs from apalache-mc/apalache ========================

Deno.test("comprehensive TLA+ spec — all syntax highlighting cases", () => {
  const tokens = tokenize(readArtifact("Comprehensive.tla"));

  // ---- Module structure ----
  assertTokenType(tokens, " MODULE ", "keyword");
  assertTokenType(tokens, "Comprehensive", "type.identifier");
  assert(
    tokens.some((t) => t.value.startsWith("====") && t.type === "comment.tla"),
    "==== footer should be comment",
  );

  // ---- Declaration keywords ----
  for (const kw of ["EXTENDS", "CONSTANT", "CONSTANTS", "VARIABLE", "VARIABLES"]) {
    assertTokenType(tokens, kw, "keyword");
  }
  assertTokenType(tokens, "ASSUME", "keyword");
  assertTokenType(tokens, "ASSUMPTION", "keyword");

  // ---- Control keywords (keyword.control subcase) ----
  for (const kw of ["IF", "THEN", "ELSE", "CASE", "OTHER"]) {
    assert(
      findTokens(tokens, kw).some((t) => t.type === "keyword.control.tla"),
      `${kw} should be keyword.control`,
    );
  }

  // ---- More keywords ----
  for (const kw of [
    "CHOOSE", "LET", "IN", "LAMBDA", "DOMAIN", "SUBSET", "UNION",
    "ENABLED", "LOCAL", "RECURSIVE", "UNCHANGED", "THEOREM", "PROOF",
    "SUFFICES", "OBVIOUS", "QED",
  ]) {
    assert(
      findTokens(tokens, kw).some((t) => t.type === "keyword.tla"),
      `${kw} should be keyword`,
    );
  }

  // ---- INSTANCE definition ----
  assert(
    findTokens(tokens, "INSTANCE").some((t) => t.type === "keyword.tla"),
    "INSTANCE should be keyword",
  );
  assert(
    findTokens(tokens, "Nats").some((t) => t.type === "variable.tla"),
    "Nats (before == INSTANCE) should be variable",
  );

  // ---- Boolean and set constants ----
  for (const c of ["TRUE", "FALSE", "BOOLEAN", "STRING", "Nat", "Int", "Real"]) {
    assert(
      findTokens(tokens, c).some((t) => t.type === "constant.tla"),
      `${c} should be constant`,
    );
  }

  // ---- Fairness keywords ----
  assertTokenType(tokens, "WF_", "keyword");
  assertTokenType(tokens, "SF_", "keyword");

  // ---- Temporal operators ----
  assert(
    findTokens(tokens, "[]").some((t) => t.type === "operator.tla"),
    "[] should be operator",
  );

  // ---- Leads-to operator ----
  assertTokenType(tokens, "~>", "operator");

  // ---- Primed variables ----
  const primeTokens = findTokens(tokens, "'");
  assert(primeTokens.length >= 1, "should have prime operators");
  for (const t of primeTokens) assertEquals(t.type, "operator.tla");

  // ---- Backslash operators ----
  for (const op of ["\\in", "\\A", "\\E", "\\cup", "\\cap", "\\subseteq", "\\notin"]) {
    assert(
      findTokens(tokens, op).some((t) => t.type === "operator.tla"),
      `${op} should be operator`,
    );
  }

  // ---- Symbol operators ----
  assertTokenType(tokens, "=>", "operator");
  assertTokenType(tokens, "<=>", "operator");
  assertTokenType(tokens, "#", "operator");
  assertTokenType(tokens, "|->", "operator");
  assertTokenType(tokens, "->", "operator");
  assertTokenType(tokens, ":>", "operator");
  assertTokenType(tokens, "<:", "operator");
  assertTokenType(tokens, "::", "operator");

  // ---- Conjunction / disjunction ----
  assert(
    findTokens(tokens, "/\\").some((t) => t.type === "operator.tla"),
    "/\\ should be operator",
  );
  assert(
    findTokens(tokens, "\\/").some((t) => t.type === "operator.tla"),
    "\\/ should be operator",
  );

  // ---- Definition operator ----
  assert(
    findTokens(tokens, "==").some((t) => t.type === "operator.tla"),
    "== should be operator",
  );

  // ---- Range operator ----
  assert(
    findTokens(tokens, "..").some((t) => t.type === "operator.tla"),
    ".. should be operator",
  );

  // ---- Function merge @@ ----
  assertTokenType(tokens, "@@", "operator");

  // ---- EXCEPT @ ----
  assert(
    findTokens(tokens, "@").some((t) => t.type === "operator.tla"),
    "@ in EXCEPT should be operator",
  );

  // ---- Numeric literals with subcases ----
  assertTokenType(tokens, "42", "number");
  assertTokenType(tokens, "\\b1010", "number.binary");
  assertTokenType(tokens, "\\o17", "number.octal");
  assertTokenType(tokens, "\\hFF", "number.hex");

  // ---- Strings ----
  assert(
    tokens.some((t) => t.type === "string.quote.tla"),
    "should have string.quote tokens",
  );
  assert(
    tokens.some((t) => t.type === "string.tla"),
    "should have string tokens",
  );
  assert(
    tokens.some((t) => t.type === "string.escape.tla"),
    "should have string.escape tokens",
  );

  // ---- Comments ----
  assert(
    tokens.some((t) => t.type === "comment.tla"),
    "should have comment tokens",
  );

  // ---- Type annotations ----
  const typeAnnotations = findTokens(tokens, "@type:");
  assert(typeAnnotations.length >= 2, "should find multiple @type: annotations");
  for (const t of typeAnnotations) assertEquals(t.type, "annotation.tla");

  const typeAliasAnnotations = findTokens(tokens, "@typeAlias:");
  assert(typeAliasAnnotations.length >= 1, "should find @typeAlias: annotation");
  for (const t of typeAliasAnnotations) assertEquals(t.type, "annotation.tla");

  // ---- Apalache type references ----
  assertTokenType(tokens, "$ENTRY", "type");

  // ---- Apalache types in annotations ----
  assert(
    findTokens(tokens, "Bool").some((t) => t.type === "type.tla"),
    "Bool should be type",
  );
  assert(
    findTokens(tokens, "Str").some((t) => t.type === "type.tla"),
    "Str should be type",
  );
  assert(
    findTokens(tokens, "Seq").some((t) => t.type === "type.tla"),
    "Seq should be type",
  );
  assert(
    findTokens(tokens, "Variant").some((t) => t.type === "type.tla"),
    "Variant should be type",
  );

  // ---- Module reference (namespace) ----
  assert(
    tokens.some((t) => t.type === "namespace.tla"),
    "should have namespace token for Nats!",
  );

  // ---- Operator definitions (variable before ==) ----
  for (const name of ["Init", "Next", "Max"]) {
    assert(
      findTokens(tokens, name).some((t) => t.type === "variable.tla"),
      `${name} in definition should be variable`,
    );
  }

  // ---- Brackets (delimiter.bracket subcase) ----
  for (const br of ["{", "}", "(", ")"]) {
    assert(
      findTokens(tokens, br).some((t) => t.type === "delimiter.bracket.tla"),
      `${br} should be delimiter.bracket`,
    );
  }

  // ---- Delimiters ----
  assert(
    findTokens(tokens, ",").some((t) => t.type === "delimiter.tla"),
    ", should be delimiter",
  );
});

