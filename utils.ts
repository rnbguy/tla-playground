import { createDefine } from "fresh";
import type { Apalache } from "./utils/apalache.ts";

export interface State {
  apalache: Apalache | null;
}

export const define = createDefine<State>();
