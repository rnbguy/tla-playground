import PlaygroundBody from "../islands/PlaygroundBody.tsx";

interface PlaygroundProps {
  tla: string;
  invs: string[];
  inv: string;
  out: string;
}

export default function Playground(props: PlaygroundProps) {
  return <PlaygroundBody {...props} />;
}
