import Playground from "../components/Playground.tsx";

export default function Body() {
  const exampleTla = {
    tla: Deno.readTextFileSync("data/playground.tla"),
    inv: "Invariant",
  };

  return <Playground {...exampleTla} />;
}
