import { App, staticFiles } from "fresh";
import type { State } from "./utils.ts";
import { getSharedApalache } from "./utils/apalache_shared.ts";

export const app = new App<State>();

app.use(staticFiles());

app.use(async (ctx) => {
  if (ctx.url.pathname.startsWith("/api/")) {
    ctx.state.apalache = await getSharedApalache();
  }

  return await ctx.next();
});

app.fsRoutes();
