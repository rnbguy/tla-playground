import Playground from "../components/Playground.tsx";
import { PageProps } from "$fresh/server.ts";

export default function Body(props: PageProps) {
  return <Playground snippetId={props.params.id} />;
}
