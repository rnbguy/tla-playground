import { define } from "../../utils.ts";
import {
  apiErrorResponse,
  ApiRequestError,
  parseJsonBodyWithLimit,
  requireObject,
  requireStringField,
} from "../../utils/api_request.ts";
import { BoundedTtlCache } from "../../utils/bounded_ttl_cache.ts";

const VERIFY_CACHE_TTL_MS = 5_000;
const VERIFY_CACHE_MAX_ENTRIES = 256;
const MAX_VERIFY_BODY_BYTES = 256 * 1024;

const verifyCache = new BoundedTtlCache<
  string,
  Record<string, unknown>
>(VERIFY_CACHE_MAX_ENTRIES);

type VerifyBody = {
  tla: string;
  inv: string;
};

function parseVerifyBody(payload: unknown): VerifyBody {
  const data = requireObject(payload, "JSON body must be an object");
  return {
    tla: requireStringField(data, "tla", 1, 200_000),
    inv: requireStringField(data, "inv", 1, 256),
  };
}

export const handler = define.handlers({
  async POST(ctx): Promise<Response> {
    const requestId = ctx.state.requestId;

    let jsonData: VerifyBody;
    try {
      const parsed = await parseJsonBodyWithLimit(
        ctx.req,
        MAX_VERIFY_BODY_BYTES,
      );
      jsonData = parseVerifyBody(parsed);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return apiErrorResponse(error.status, error.message, requestId);
      }
      return apiErrorResponse(400, "Invalid request body", requestId);
    }

    const bmcLength = 10;
    const apalache = ctx.state.apalache;
    if (!apalache) {
      return apiErrorResponse(503, "Apalache server unavailable", requestId);
    }

    const cacheKey = `${jsonData.tla}::${jsonData.inv}`;
    const cached = verifyCache.get(cacheKey);
    if (cached) {
      return Response.json(cached);
    }

    let respJson: Awaited<ReturnType<typeof apalache.modelCheck>>;
    try {
      respJson = await apalache.modelCheck(
        jsonData.tla,
        jsonData.inv,
        bmcLength - 1,
      );
    } catch {
      return apiErrorResponse(502, "Apalache request failed", requestId);
    }

    const outJson: Record<string, unknown> = {};

    if (respJson.result === "failure") {
      let parsedJson: {
        msg?: string;
        pass_name?: string;
        error_data?: Record<string, unknown> & {
          counterexamples?: Array<{ states: Record<string, unknown>[] }>;
        };
      };
      try {
        parsedJson = JSON.parse(respJson.failure.data) as Record<
          string,
          unknown
        >;
      } catch {
        return apiErrorResponse(
          502,
          "Invalid Apalache failure payload",
          requestId,
        );
      }
      if (parsedJson.msg) {
        outJson.result = parsedJson.msg;
      } else {
        if (
          parsedJson.pass_name === "BoundedChecker" &&
          parsedJson.error_data?.counterexamples
        ) {
          outJson.result = "Violated";
          outJson.counterexample = parsedJson.error_data.counterexamples[0]
            .states.map((e: Record<string, unknown>) => {
              delete e["#meta"];
              return e;
            });
        } else if (parsedJson.pass_name) {
          outJson.result = `Error in ${parsedJson.pass_name}`;
          outJson.error = parsedJson.error_data ?? null;
        } else {
          Object.assign(outJson, parsedJson as Record<string, unknown>);
        }
      }
    } else {
      outJson.result = "Verified";
      outJson.length = bmcLength;
    }

    outJson.description = `Created by Apalache on ${new Date().toUTCString()}`;
    verifyCache.set(cacheKey, outJson, VERIFY_CACHE_TTL_MS);

    return Response.json(outJson);
  },
});
