import { assertEquals } from "@std/assert";
import type { FreshContext } from "fresh";
import type { State } from "../../utils.ts";
import type { Apalache } from "../../utils/apalache.ts";
import { handler } from "./invariants.ts";

function createCtx(
  req: Request,
  apalache: Apalache | null,
): FreshContext<State> {
  return {
    req,
    state: {
      apalache,
      requestId: "req-test-invariants",
    },
  } as unknown as FreshContext<State>;
}

Deno.test("invariants route extracts boolean declarations", async () => {
  const fakeApalache = {
    modelTypeCheck: () =>
      Promise.resolve({
        result: "success",
        success: JSON.stringify({
          modules: [{
            declarations: [
              { type: "Bool", name: "InvA" },
              { type: "(() => Bool)", name: "InvB" },
              { type: "Int", name: "X" },
              { type: "Bool", name: "Init" },
            ],
          }],
        }),
      }),
  } as unknown as Apalache;

  const req = new Request("http://localhost/api/invariants", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tla: "---- MODULE X ----\n====" }),
  });

  const response = await handler.POST(createCtx(req, fakeApalache));
  const payload = await response.json() as string[];

  assertEquals(response.status, 200);
  assertEquals(payload, ["InvA", "InvB"]);
});

Deno.test("invariants route enforces json content type", async () => {
  const req = new Request("http://localhost/api/invariants", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "bad",
  });

  const response = await handler.POST(createCtx(req, null));
  assertEquals(response.status, 415);
});
