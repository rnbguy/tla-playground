import { HandlerContext } from "$fresh/server.ts";

export const handler = {
  async POST(req: Request, _ctx: HandlerContext): Promise<Response> {
    const jsonData = await req.json();

    return Response.json({ "res": "hello world", "req": jsonData });
  },
};
