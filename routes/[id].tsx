import { PageProps } from "$fresh/server.ts";
import { Editor } from "../components/Playground.tsx";
import Run from "../islands/Run.tsx";

export default function Playground(props: PageProps) {
  return (
    <div>
      <div class="mx-auto w-64 p-4 rounded shadow font-mono text-center">
        Snippet #{props.params.id}
      </div>
      <Run executeLog={"Idle."} />
      <Editor />
    </div>
  );
}
