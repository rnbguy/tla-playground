import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";
import * as yaml from "@std/yaml";
import { Moon, Play, Sun } from "lucide-preact";
import IconBrandDeno from "@tabler/icons-preact/IconBrandDeno.mjs";
import IconBrandGithub from "@tabler/icons-preact/IconBrandGithub.mjs";
import IconLemon from "@tabler/icons-preact/IconLemon.mjs";
import IconMountain from "@tabler/icons-preact/IconMountain.mjs";

import { createHighlighterCore } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import { shikiToMonaco } from "@shikijs/monaco";
import githubLight from "@shikijs/themes/github-light";
import githubDark from "@shikijs/themes/github-dark";

import { TLAPlusMonarchLanguage } from "../utils/tlaMonarch.ts";

interface PlaygroundProps {
  tla: string;
  invs: string[];
  inv: string;
  out: string;
}

type VerifyResponse = Record<string, unknown>;

type ResolvedTheme = "light" | "dark";
type DarknessMode = "dark" | "light";

const DARKNESS_MODE_STORAGE_KEY = "playground-darkness";

const CODE_FONT = "Fira Code, monospace";
const GITHUB_THEME_LIGHT = "github-light";
const GITHUB_THEME_DARK = "github-dark";

function readStoredDarknessMode(): DarknessMode | null {
  const stored = localStorage.getItem(DARKNESS_MODE_STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return null;
}

function extractApiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") {
    return record.message;
  }
  if (typeof record.error === "string") {
    return record.error;
  }

  return null;
}

function normalizeInvariants(invariants: string[]): string[] {
  const unique = Array.from(new Set(invariants));
  unique.sort((a, b) => {
    const rank = (name: string) => {
      return name.toLowerCase().includes("inv") ? 0 : 1;
    };
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return a.localeCompare(b);
  });
  return unique;
}

type MonacoEditor = {
  getValue: () => string;
  setValue: (value: string) => void;
  addCommand: (keybinding: number, handler: () => void) => void;
  onDidChangeModelContent: (handler: () => void) => { dispose: () => void };
  updateOptions: (options: Record<string, unknown>) => void;
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
    setTheme: (themeName: string) => void;
  };
};

const MONACO_VERSION = "0.55.1";
const MONACO_ESM = `https://esm.sh/monaco-editor@${MONACO_VERSION}`;

let monacoLoadPromise: Promise<MonacoNamespace> | null = null;
let shikiHighlighter: import("@shikijs/core").HighlighterCore | null = null;
let shikiLoadPromise: Promise<void> | null = null;

function loadMonaco(): Promise<MonacoNamespace> {
  if (!monacoLoadPromise) {
    monacoLoadPromise = (async () => {
      (globalThis as Record<string, unknown>).MonacoEnvironment = {
        getWorker() {
          const blob = new Blob(
            [`import "${MONACO_ESM}/esm/vs/editor/editor.worker.js";`],
            { type: "application/javascript" },
          );
          return new Worker(URL.createObjectURL(blob), { type: "module" });
        },
      };
      const monaco = await import(/* @vite-ignore */ MONACO_ESM);
      return monaco as unknown as MonacoNamespace;
    })().catch((error) => {
      monacoLoadPromise = null;
      throw error;
    });
  }

  return monacoLoadPromise;
}

async function initShikiWithTheme(monaco: MonacoNamespace): Promise<void> {
  if (shikiLoadPromise) {
    await shikiLoadPromise;
    return;
  }

  shikiLoadPromise = (async () => {
    const highlighter = await createHighlighterCore({
      themes: [githubLight, githubDark],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    });

    shikiToMonaco(highlighter, monaco);
    shikiHighlighter = highlighter;
  })().catch((error) => {
    shikiLoadPromise = null;
    throw error;
  });

  await shikiLoadPromise;
}

type ThemePalette = {
  bg: string;
  fg: string;
  surface: string;
  surfaceStrong: string;
  editorBg: string;
  muted: string;
  accent: string;
  accentStrong: string;
  accentFg: string;
  danger: string;
};

function pickThemeColor(
  theme: import("@shikijs/core").ThemeRegistrationResolved,
  keys: string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = theme.colors?.[key];
    if (value) {
      return value;
    }
  }
  return fallback;
}

function buildThemePalette(
  theme: import("@shikijs/core").ThemeRegistrationResolved,
): ThemePalette {
  const bg = theme.bg || theme.colors?.["editor.background"] || "Canvas";
  const fg = theme.fg || theme.colors?.["editor.foreground"] || "CanvasText";
  const surface = pickThemeColor(
    theme,
    [
      "editor.background",
      "sideBar.background",
      "panel.background",
      "editorWidget.background",
    ],
    bg,
  );
  const surfaceStrong = pickThemeColor(
    theme,
    [
      "editorWidget.background",
      "dropdown.background",
      "panel.background",
      "menu.background",
    ],
    surface,
  );
  const editorBg = pickThemeColor(
    theme,
    ["editor.background", "terminal.background", "panel.background"],
    bg,
  );
  const muted = pickThemeColor(
    theme,
    [
      "descriptionForeground",
      "editorLineNumber.foreground",
      "sideBar.foreground",
      "disabledForeground",
    ],
    fg,
  );
  const accent = pickThemeColor(
    theme,
    [
      "button.background",
      "textLink.foreground",
      "editorLink.activeForeground",
      "terminal.ansiBlue",
      "terminal.ansiBrightBlue",
    ],
    fg,
  );
  const accentStrong = pickThemeColor(
    theme,
    [
      "button.hoverBackground",
      "textLink.activeForeground",
      "statusBarItem.remoteBackground",
      "terminal.ansiBrightBlue",
    ],
    accent,
  );
  const accentFg = pickThemeColor(
    theme,
    ["button.foreground", "badge.foreground", "editor.background"],
    fg,
  );
  const danger = pickThemeColor(
    theme,
    [
      "errorForeground",
      "editorError.foreground",
      "terminal.ansiRed",
      "terminal.ansiBrightRed",
    ],
    fg,
  );

  return {
    bg,
    fg,
    surface,
    surfaceStrong,
    editorBg,
    muted,
    accent,
    accentStrong,
    accentFg,
    danger,
  };
}

function applyThemePalette(themeName: string) {
  if (!shikiHighlighter) {
    return;
  }
  const theme = shikiHighlighter.getTheme(themeName);
  const palette = buildThemePalette(theme);
  const root = document.documentElement;
  root.style.setProperty("--theme-bg", palette.bg);
  root.style.setProperty("--theme-fg", palette.fg);
  root.style.setProperty("--theme-surface", palette.surface);
  root.style.setProperty("--theme-surface-strong", palette.surfaceStrong);
  root.style.setProperty("--theme-editor-bg", palette.editorBg);
  root.style.setProperty("--theme-muted", palette.muted);
  root.style.setProperty("--theme-accent", palette.accent);
  root.style.setProperty("--theme-accent-strong", palette.accentStrong);
  root.style.setProperty("--theme-accent-fg", palette.accentFg);
  root.style.setProperty("--theme-danger", palette.danger);
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

export default function PlaygroundBody(props: PlaygroundProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const editor = useRef<MonacoEditor | null>(null);
  const outputEditor = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const editorChangeDebounceRef = useRef<number | null>(null);
  const verifyAbortRef = useRef<AbortController | null>(null);
  const invariantsAbortRef = useRef<AbortController | null>(null);
  const verifyRequestIdRef = useRef(0);
  const invariantsRequestIdRef = useRef(0);
  const invariantsCacheRef = useRef(new Map<string, string[]>());

  const loadingText = useSignal("");
  const consoleText = useSignal(props.out);
  const errorText = useSignal("");
  const darknessMode = useSignal<DarknessMode>("light");
  const selectedInv = useSignal(props.inv);
  const allInvs = useSignal<string[]>(props.invs);

  const renderOutput = (text: string) => {
    consoleText.value = text;
    const output = outputEditor.current;
    if (!output) {
      return;
    }

    output.setValue(text.trim() ? text : "\n");
  };

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");

    const stored = readStoredDarknessMode();
    if (stored) {
      darknessMode.value = stored;
    } else {
      darknessMode.value = mediaQuery.matches ? "dark" : "light";
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DARKNESS_MODE_STORAGE_KEY, darknessMode.value);

    const resolved = darknessMode.value;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
    if (monacoRef.current) {
      const themeName = resolved === "dark"
        ? GITHUB_THEME_DARK
        : GITHUB_THEME_LIGHT;
      monacoRef.current.editor.setTheme(themeName);
      applyThemePalette(themeName);
    }

    void renderOutput(consoleText.value);
  }, [darknessMode.value]);

  useEffect(() => {
    document.documentElement.style.setProperty("--code-font", CODE_FONT);
    editor.current?.updateOptions({ fontFamily: CODE_FONT });
    outputEditor.current?.updateOptions({ fontFamily: CODE_FONT });
  }, []);

  useEffect(() => {
    void loadMonaco();
  }, []);

  const toggleTheme = () => {
    darknessMode.value = darknessMode.value === "dark" ? "light" : "dark";
  };
  useEffect(() => {
    let isDisposed = false;

    let initTla: PlaygroundProps = props;
    const rawStoredSnippet = localStorage.getItem("tla-snippet");
    if (rawStoredSnippet) {
      try {
        const parsed = JSON.parse(rawStoredSnippet) as PlaygroundProps;
        if (
          parsed.tla.length > 0 &&
          Array.isArray(parsed.invs) &&
          parsed.invs.length > 0 &&
          typeof parsed.inv === "string"
        ) {
          initTla = parsed;
        }
      } catch {
        initTla = props;
      }
    }

    void renderOutput(initTla.out);

    void loadMonaco().then((monaco) => {
      void (async () => {
        if (isDisposed || !editorRef.current) {
          return;
        }

        monacoRef.current = monaco;

        monaco.languages.register({ id: "tla" });

        monaco.languages.setMonarchTokensProvider(
          "tla",
          TLAPlusMonarchLanguage,
        );

        const initialTheme = darknessMode.value === "dark"
          ? GITHUB_THEME_DARK
          : GITHUB_THEME_LIGHT;

        editor.current = monaco.editor.create(editorRef.current, {
          language: "tla",
          readOnly: false,
          automaticLayout: true,
          contextmenu: true,
          fontFamily: CODE_FONT,
          fontSize: 14,
          lineHeight: 20,
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

        await initShikiWithTheme(monaco);
        monaco.editor.setTheme(initialTheme);
        applyThemePalette(initialTheme);

        if (outputRef.current) {
          outputEditor.current = monaco.editor.create(outputRef.current, {
            language: "yaml",
            readOnly: true,
            domReadOnly: true,
            automaticLayout: true,
            contextmenu: false,
            fontFamily: CODE_FONT,
            fontSize: 13,
            lineHeight: 20,
            lineNumbersMinChars: 2,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            overviewRulerLanes: 0,
          });

          renderOutput(consoleText.value || initTla.out);
        }

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

        allInvs.value = normalizeInvariants(initTla.invs);
        selectedInv.value = initTla.inv;

        const scheduleInvariantSync = () => {
          if (editorChangeDebounceRef.current !== null) {
            globalThis.clearTimeout(editorChangeDebounceRef.current);
          }

          editorChangeDebounceRef.current = globalThis.setTimeout(
            async () => {
              const currentEditor = editor.current;
              if (!currentEditor) {
                return;
              }

              const tla = currentEditor.getValue();
              const invariants = normalizeInvariants(
                await tlaInvariants({ tla }),
              );

              allInvs.value = invariants;
              if (invariants.length === 0) {
                selectedInv.value = "";
              } else if (!invariants.includes(selectedInv.value)) {
                selectedInv.value = invariants[0] ?? "";
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
            },
            500,
          );
        };

        const changeSubscription = editor.current.onDidChangeModelContent(
          scheduleInvariantSync,
        );

        const previousDispose = editor.current.dispose.bind(editor.current);
        editor.current.dispose = () => {
          changeSubscription.dispose();
          previousDispose();
        };

        if (outputEditor.current) {
          const previousOutputDispose = outputEditor.current.dispose.bind(
            outputEditor.current,
          );
          outputEditor.current.dispose = () => {
            previousOutputDispose();
          };
        }
      })().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        errorText.value = `> ${message}`;
      });
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      errorText.value = `> ${message}`;
    });

    return () => {
      isDisposed = true;
      if (editorChangeDebounceRef.current !== null) {
        globalThis.clearTimeout(editorChangeDebounceRef.current);
        editorChangeDebounceRef.current = null;
      }
      verifyAbortRef.current?.abort();
      invariantsAbortRef.current?.abort();
      editor.current?.dispose();
      outputEditor.current?.dispose();
      editor.current = null;
      outputEditor.current = null;
    };
  }, []);

  async function tlaInvariants(data: { tla: string }): Promise<string[]> {
    const cachedInvariants = invariantsCacheRef.current.get(data.tla);
    if (cachedInvariants) {
      return cachedInvariants;
    }

    invariantsAbortRef.current?.abort();
    const abortController = new AbortController();
    invariantsAbortRef.current = abortController;
    const requestId = ++invariantsRequestIdRef.current;

    try {
      const response = await fetch("/api/invariants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const payload = await response.json();
        const message = extractApiMessage(payload) ??
          `Invariants API failed with status ${response.status}`;
        console.error(`[frontend api error] ${message}`);
        return [];
      }

      const invariants = await response.json() as string[];
      if (requestId !== invariantsRequestIdRef.current) {
        return [];
      }

      invariantsCacheRef.current.set(data.tla, invariants);
      return invariants;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return [];
      }
      console.error("[frontend error] Failed to call /api/invariants", error);
      return [];
    }
  }

  async function tlaVerify(
    data: { tla: string; inv: string },
  ): Promise<VerifyResponse> {
    verifyAbortRef.current?.abort();
    const abortController = new AbortController();
    verifyAbortRef.current = abortController;
    const requestId = ++verifyRequestIdRef.current;

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        signal: abortController.signal,
      });

      const payload = await response.json();
      if (requestId !== verifyRequestIdRef.current) {
        return {};
      }

      if (!response.ok) {
        const message = extractApiMessage(payload) ??
          `Verify API failed with status ${response.status}`;
        console.error(`[frontend api error] ${message}`);
      }

      return payload as VerifyResponse;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return {};
      }
      console.error("[frontend error] Failed to call /api/verify", error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  const processText = async () => {
    const currentEditor = editor.current;
    if (!currentEditor) {
      return;
    }

    const tla = currentEditor.getValue();

    loadingText.value = "> queued";
    const invariants = normalizeInvariants(await tlaInvariants({ tla }));

    allInvs.value = invariants;

    const invariantToVerify = invariants.includes(selectedInv.value)
      ? selectedInv.value
      : (invariants[0] ?? "");

    if (!invariantToVerify) {
      void renderOutput("");
      errorText.value = "> No invariant available to verify";
      return;
    }

    selectedInv.value = invariantToVerify;

    // const spinner = new Spinner(["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]);
    const spinner = new Spinner(["...", " ..", ". .", ".. "]);
    errorText.value = "";
    void renderOutput("");
    loadingText.value = "> running";

    const spinnerTimer = globalThis.setInterval(() => {
      loadingText.value = `> processing ${spinner.next()}`;
    }, 200);
    void renderOutput("");
    const data = { tla, inv: invariantToVerify };
    const respJson = await tlaVerify(data);

    globalThis.clearInterval(spinnerTimer);
    loadingText.value = "";

    const rendered = yaml.stringify(respJson, { indent: 2 }).trim();
    const output = rendered.length > 0
      ? rendered
      : JSON.stringify(respJson, null, 2);
    renderOutput(output);
  };

  return (
    <div class="playground-shell">
      <header class="playground-toolbar">
        <div class="toolbar-left">
          <select
            value={selectedInv.value}
            class="control-select"
            onChange={(e) => {
              selectedInv.value = e.currentTarget.value;
            }}
          >
            <option key="placeholder" value="" disabled>
              Select an invariant
            </option>
            {allInvs.value.map((inv) => (
              <option value={inv} key={inv}>
                {inv}
              </option>
            ))}
          </select>

          <button
            type="button"
            class="verify-button icon-button"
            onClick={processText}
            title="Run verification"
            aria-label="Run verification"
          >
            <Play aria-hidden="true" class="icon-stroke" size={16} />
          </button>
        </div>

        <div class="toolbar-right">
          <button
            type="button"
            class="theme-button icon-button"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label="Toggle darkness mode"
          >
            {darknessMode.value === "dark"
              ? <Moon size={20} />
              : <Sun size={20} />}
          </button>
        </div>
      </header>

      <main class="playground-main">
        <section ref={editorRef} class="editor-pane"></section>
        <section class="output-pane" aria-live="polite">
          {loadingText.value && <div class="output-status">{loadingText}</div>}
          <section ref={outputRef} class="output-editor"></section>
          {!consoleText.value.trim() && (
            <pre class="output-text">{consoleText}</pre>
          )}
          <pre class="output-error">{errorText}</pre>
        </section>
      </main>

      <footer class="playground-footer">
        <div class="footer-group">
          <span>Made with</span>
          <a
            class="footer-link"
            href="https://apalache-mc.org"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>Apalache</span>
            <IconMountain size={16} />
          </a>
          <span>,</span>
          <a
            class="footer-link"
            href="https://fresh.deno.dev"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>Fresh</span>
            <IconLemon size={16} />
          </a>
          <span>,</span>
          <a
            class="footer-link"
            href="https://deno.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span>Deno</span>
            <IconBrandDeno size={16} />
          </a>
        </div>
        <a
          class="footer-link"
          href="https://github.com/rnbguy/fresh-playground"
          rel="noopener noreferrer"
          target="_blank"
        >
          <span>View Source</span>
          <IconBrandGithub size={16} />
        </a>
      </footer>
    </div>
  );
}
