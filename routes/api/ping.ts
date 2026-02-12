import { define } from "../../utils.ts";
import { refreshSharedApalache } from "../../utils/apalache_shared.ts";
import { apiErrorResponse } from "../../utils/api_request.ts";

export const handler = define.handlers({
  async GET(ctx): Promise<Response> {
    const requestId = ctx.state.requestId;
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
        return apiErrorResponse(503, message, requestId);
      }
    }
  },
});
