import { assertMatch } from "@std/assert";

Deno.test("e2e verify output contains Apalache description", async () => {
  const baseUrl = Deno.env.get("E2E_BASE_URL");
  if (!baseUrl) {
    return;
  }

  const response = await fetch(`${baseUrl}/api/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tla: "---- MODULE X ----\nVARIABLE x\nInit == x = 0\nNext == TRUE\n====",
      inv: "Init",
    }),
  });

  const payload = await response.json() as Record<string, unknown>;
  assertMatch(String(payload.description), /Created by Apalache on/);
});
