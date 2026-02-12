import { h } from "preact";
import { App, staticFiles } from "fresh";
import type { State } from "./utils.ts";
import { getSharedApalache } from "./utils/apalache_shared.ts";

// Make h available globally for JSX compilation
(globalThis as Record<string, unknown>).h = h;

export const app = new App<State>();

const API_RATE_WINDOW_MS = 10_000;
const API_RATE_MAX_REQUESTS = 40;
const API_HEAVY_CONCURRENCY_LIMIT = 6;

type RateBucket = {
  count: number;
  windowStart: number;
};

const rateBuckets = new Map<string, RateBucket>();
let heavyApiInFlight = 0;

function getClientKey(ctx: { req: Request; remoteAddr?: Deno.Addr }): string {
  const forwarded = ctx.req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  const addr = ctx.remoteAddr;
  if (
    addr &&
    "hostname" in addr &&
    typeof addr.hostname === "string"
  ) {
    return addr.hostname;
  }

  return "unknown";
}

function allowApiRequest(clientKey: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(clientKey);
  if (!bucket || now - bucket.windowStart >= API_RATE_WINDOW_MS) {
    rateBuckets.set(clientKey, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= API_RATE_MAX_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  rateBuckets.set(clientKey, bucket);
  return true;
}

function acquireHeavySlot(): boolean {
  if (heavyApiInFlight >= API_HEAVY_CONCURRENCY_LIMIT) {
    return false;
  }

  heavyApiInFlight += 1;
  return true;
}

function releaseHeavySlot(): void {
  heavyApiInFlight = Math.max(0, heavyApiInFlight - 1);
}

function logApiEvent(payload: Record<string, unknown>) {
  console.info(JSON.stringify({
    ts: new Date().toISOString(),
    event: "api_request",
    ...payload,
  }));
}

app.use(staticFiles());

app.use(async (ctx) => {
  const requestId = ctx.req.headers.get("x-request-id") ?? crypto.randomUUID();
  ctx.state.requestId = requestId;

  const path = ctx.url.pathname;
  const isApiRoute = path.startsWith("/api/");
  const clientKey = getClientKey(ctx);
  const startedAt = Date.now();

  let acquiredHeavySlot = false;
  let responseStatus = 500;

  try {
    if (isApiRoute) {
      if (!allowApiRequest(clientKey)) {
        responseStatus = 429;
        return Response.json(
          { error: "Too many requests", requestId },
          { status: 429, headers: { "x-request-id": requestId } },
        );
      }

      const isHeavyRoute = ctx.req.method === "POST" &&
        (path === "/api/verify" || path === "/api/invariants");
      if (isHeavyRoute) {
        acquiredHeavySlot = acquireHeavySlot();
        if (!acquiredHeavySlot) {
          responseStatus = 429;
          return Response.json(
            { error: "Server is busy, retry shortly", requestId },
            { status: 429, headers: { "x-request-id": requestId } },
          );
        }
      }

      try {
        ctx.state.apalache = await getSharedApalache();
      } catch {
        ctx.state.apalache = null;
      }
    }

    const response = await ctx.next();
    responseStatus = response.status;
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    if (!isApiRoute) {
      throw error;
    }

    responseStatus = 500;
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      event: "api_error",
      requestId,
      method: ctx.req.method,
      path,
      message,
    }));
    return Response.json(
      { error: "Internal server error", requestId },
      { status: 500, headers: { "x-request-id": requestId } },
    );
  } finally {
    if (acquiredHeavySlot) {
      releaseHeavySlot();
    }

    if (isApiRoute) {
      logApiEvent({
        requestId,
        method: ctx.req.method,
        path,
        status: responseStatus,
        durationMs: Date.now() - startedAt,
        clientKey,
      });
    }
  }
});

app.fsRoutes();
