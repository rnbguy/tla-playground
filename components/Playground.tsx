export function Editor() {
  const monacoId = "monaco-editor";
  return (
    <>
      <div
        id={monacoId}
        class="rounded min-w-full min-h-[30rem] overflow-x-auto bg-gray-100"
      />

      <link
        rel="stylesheet"
        data-name="vs/editor/editor.main"
        href="https://unpkg.com/monaco-editor/min/vs/editor/editor.main.css"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
                  var require = { paths: { vs: 'https://unpkg.com/monaco-editor/min/vs' } };
              `,
        }}
      />
      <script src="https://unpkg.com/monaco-editor/min/vs/loader.js" />
      <script src="https://unpkg.com/monaco-editor/min/vs/editor/editor.main.nls.js" />
      <script src="https://unpkg.com/monaco-editor/min/vs/editor/editor.main.js" />

      <script
        dangerouslySetInnerHTML={{
          __html: `
                  var editor = monaco.editor.create(document.getElementById('${monacoId}'), {
                      value: ['function x() {', '\tconsole.log("Hello world!");', '}'].join('\\n'),
                      language: 'javascript'
                  });
              `,
        }}
      />
    </>
  );
}
