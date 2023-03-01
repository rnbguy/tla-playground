import { useState } from "preact/hooks";
import { Button } from "../components/Button.tsx";

interface RunProps {
  executeLog: string;
}

export default function Run(props: RunProps) {
  const [executeLog, setExecuteLog] = useState(props.executeLog);
  return (
    <div class="flex gap-2 w-full">
      <Button onClick={() => setExecuteLog("Executed")}>Run</Button>
      <div class="px-2 py-1 font-mono">{executeLog}</div>
    </div>
  );
}
