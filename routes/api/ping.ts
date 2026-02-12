import { define } from "../../utils.ts";
import { refreshSharedApalache } from "../../utils/apalache_shared.ts";

export const handler = define.handlers({
  async GET(ctx): Promise<Response> {
    let apalache = ctx.state.apalache;

    try {
      if (!apalache) {
        apalache = await refreshSharedApalache();
      }

      await apalache.ping();
      return Response.json({ status: "ok" });
    } catch {
      try {
        const refreshedApalache = await refreshSharedApalache();
        ctx.state.apalache = refreshedApalache;
        await refreshedApalache.ping();
        return Response.json({ status: "ok" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return Response.json({ status: "error", message }, { status: 503 });
      }
    }
  },
});
