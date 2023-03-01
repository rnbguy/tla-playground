import { PageProps } from "$fresh/server.ts";
import { Editor } from "../components/Playground.tsx";

export default function Playground(props: PageProps) {
  return (
    <div>
      <p class="mx-auto w-64 p-4 rounded shadow font-mono text-center">
        Snippet #{props.params.id}
      </p>
      <Editor />
    </div>
  );
}
