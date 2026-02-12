import { createDefine } from "fresh";
import type { Apalache } from "./utils/apalache.ts";

export interface State {
  apalache: Apalache | null;
  requestId: string;
}

export const define = createDefine<State>();
