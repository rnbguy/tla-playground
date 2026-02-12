import { define } from "../../utils.ts";
import {
  apiErrorResponse,
  ApiRequestError,
  parseJsonBodyWithLimit,
  requireObject,
  requireStringField,
} from "../../utils/api_request.ts";
import { BoundedTtlCache } from "../../utils/bounded_ttl_cache.ts";

const INVARIANTS_CACHE_TTL_MS = 10_000;
const INVARIANTS_CACHE_MAX_ENTRIES = 256;
const MAX_INVARIANTS_BODY_BYTES = 256 * 1024;

const invariantsCache = new BoundedTtlCache<
  string,
  string[]
>(INVARIANTS_CACHE_MAX_ENTRIES);

type InvariantsBody = {
  tla: string;
};

function parseInvariantsBody(payload: unknown): InvariantsBody {
  const data = requireObject(payload, "JSON body must be an object");
  return {
    tla: requireStringField(data, "tla", 1, 200_000),
  };
}

export const handler = define.handlers({
  async POST(ctx): Promise<Response> {
    const requestId = ctx.state.requestId;

    let jsonData: InvariantsBody;
    try {
      const parsed = await parseJsonBodyWithLimit(
        ctx.req,
        MAX_INVARIANTS_BODY_BYTES,
      );
      jsonData = parseInvariantsBody(parsed);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return apiErrorResponse(error.status, error.message, requestId);
      }
      return apiErrorResponse(400, "Invalid request body", requestId);
    }

    const apalache = ctx.state.apalache;
    if (!apalache) {
      return apiErrorResponse(503, "Apalache server unavailable", requestId);
    }

    const cacheKey = jsonData.tla;
    const cached = invariantsCache.get(cacheKey);
    if (cached) {
      return Response.json(cached);
    }

    let respJson: Awaited<ReturnType<typeof apalache.modelTypeCheck>>;
    try {
      respJson = await apalache.modelTypeCheck(
        jsonData.tla,
      );
    } catch {
      return apiErrorResponse(502, "Apalache request failed", requestId);
    }

    if (respJson.result === "success") {
      let resp: {
        modules?: Array<
          { declarations?: Array<{ type: string; name: string }> }
        >;
      };
      try {
        resp = JSON.parse(respJson.success) as {
          modules?: Array<
            { declarations?: Array<{ type: string; name: string }> }
          >;
        };
      } catch {
        return apiErrorResponse(
          502,
          "Invalid Apalache success payload",
          requestId,
        );
      }

      const declarations = resp.modules?.[0]?.declarations ?? [];
      const invariants = declarations.filter((
        d: { type: string; name: string },
      ) => d.type === "Bool" || d.type === "(() => Bool)").map((
        d: { name: string },
      ) => d.name).filter((d: string) => d !== "Init" && d !== "Next");
      invariantsCache.set(cacheKey, invariants, INVARIANTS_CACHE_TTL_MS);
      return Response.json(invariants);
    } else {
      return Response.json([]);
    }
  },
});
