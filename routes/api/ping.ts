import { define } from "../../utils.ts";

export const handler = define.handlers({
  async GET(ctx): Promise<Response> {
    try {
      const apalache = ctx.state.apalache;
      if (!apalache) {
        return Response.json(
          { status: "error", message: "Apalache server unavailable" },
          { status: 503 },
        );
      }
      await apalache.ping();
      return Response.json({ status: "ok" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ status: "error", message }, { status: 503 });
    }
  },
});
