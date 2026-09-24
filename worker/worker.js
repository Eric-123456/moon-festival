/**
 * 月圓之夜 — 結局統計 API
 *
 * 兩個端點:
 *   POST /increment   body: { "ending": "reunion_quiet" }   → 該結局計數 +1
 *   GET  /stats                                             → 回傳所有結局的目前計數
 *   POST /stories        body: 玩家結局與故事路徑           → 保存玩家故事
 *   GET  /stories                                           → 回傳最近玩家故事
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
  "peace",
  "hidden"
];

const MAX_STORIES = 200;

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

    if (url.pathname === "/stories" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch (e) { return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }); }
      const player = String(body.player || "月光旅人").trim().slice(0, 24) || "月光旅人";
      const ending = String(body.ending || "");
      if (!ENDINGS.includes(ending)) return new Response(JSON.stringify({ error: "unknown ending id" }), { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } });
      const id = `${Date.now()}-${crypto.randomUUID()}`;
      const record = { id, player, ending, endingTitle: String(body.endingTitle || "").slice(0, 80), description: String(body.description || "").slice(0, 500), path: Array.isArray(body.path) ? body.path.slice(0, 30).map(item => String(item).slice(0, 200)) : [], memories: Array.isArray(body.memories) ? body.memories.slice(0, 20).map(item => String(item).slice(0, 80)) : [], date: new Date().toISOString() };
      await env.ENDINGS_KV.put(`story:${id}`, JSON.stringify(record));
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders(), "Content-Type": "application/json" } });
    }

    if (url.pathname === "/stories" && request.method === "GET") {
      const listing = await env.ENDINGS_KV.list({ prefix: "story:", limit: MAX_STORIES });
      const records = await Promise.all(listing.keys.map(async key => JSON.parse(await env.ENDINGS_KV.get(key.name))));
      records.sort((a, b) => b.date.localeCompare(a.date));
      return new Response(JSON.stringify(records), { headers: { ...corsHeaders(), "Content-Type": "application/json" } });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders() });
  }
};
