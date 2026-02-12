import { define } from "../../utils.ts";

export const handler = define.handlers({
  async GET(ctx): Promise<Response> {
    try {
      const apalache = ctx.state.apalache;
      await apalache.ping();
      return Response.json({ status: "ok" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ status: "error", message }, { status: 503 });
    }
  },
});
