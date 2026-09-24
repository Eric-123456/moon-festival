/**
 * 月圓之夜 — 結局統計 API
 *
 * 兩個端點:
 *   POST /increment   body: { "ending": "reunion_quiet" }   → 該結局計數 +1
 *   GET  /stats                                             → 回傳所有結局的目前計數
 *
 * 需要綁定一個 KV namespace,變數名稱是 ENDINGS_KV(見 wrangler.toml)。
 */

const ENDINGS = [
  "gratitude",
  "reunion_quiet",
  "legend",
  "homeward2",
  "homeward",
  "hope",
  "peace"
];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/increment" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: "invalid json" }), {
          status: 400,
          headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
      }

      const id = body.ending;
      if (!ENDINGS.includes(id)) {
        return new Response(JSON.stringify({ error: "unknown ending id" }), {
          status: 400,
          headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
      }

      const current = parseInt((await env.ENDINGS_KV.get(id)) || "0", 10);
      await env.ENDINGS_KV.put(id, String(current + 1));

      return new Response(JSON.stringify({ ok: true, ending: id, count: current + 1 }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      const results = {};
      for (const id of ENDINGS) {
        results[id] = parseInt((await env.ENDINGS_KV.get(id)) || "0", 10);
      }
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  }
};
