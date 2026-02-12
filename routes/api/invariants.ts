import { define } from "../../utils.ts";

const INVARIANTS_CACHE_TTL_MS = 10_000;
const invariantsCache = new Map<
  string,
  { value: string[]; expiresAt: number }
>();

export const handler = define.handlers({
  async POST(ctx): Promise<Response> {
    const req = ctx.req;
    const jsonData = await req.json();
    const apalache = ctx.state.apalache;
    if (!apalache) {
      return Response.json({ error: "Apalache server unavailable" }, {
        status: 503,
      });
    }

    const cacheKey = jsonData.tla;
    const cached = invariantsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return Response.json(cached.value);
    }

    const respJson = await apalache.modelTypeCheck(
      jsonData.tla,
    );

    if (respJson.result === "success") {
      const resp = JSON.parse(respJson.success);
      const invariants = resp.modules[0].declarations.filter((
        d: { type: string; name: string },
      ) => d.type === "Bool" || d.type === "(() => Bool)").map((
        d: { name: string },
      ) => d.name).filter((d: string) => d !== "Init" && d !== "Next");
      invariantsCache.set(cacheKey, {
        value: invariants,
        expiresAt: Date.now() + INVARIANTS_CACHE_TTL_MS,
      });
      return Response.json(invariants);
    } else {
      return Response.json([]);
    }
  },
});
