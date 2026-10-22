const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};

async function plays(env) {
  const raw = await env.PLAYS.get("count");
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function json(body, status = 200) {
  return Response.json(body, { status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/plays") return new Response("not found", { status: 404, headers });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method === "GET") return json({ plays: await plays(env) });
    if (request.method !== "POST") return new Response("method", { status: 405, headers });

    let seconds = 0;
    try {
      seconds = Number((await request.json()).seconds) || 0;
    } catch {
      seconds = 0;
    }
    if (seconds < 20 || seconds > 60 * 60) return json({ plays: await plays(env), counted: false });

    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    if (await env.PLAYS.get(`lock:${ip}`)) return json({ plays: await plays(env), counted: false });
    await env.PLAYS.put(`lock:${ip}`, "1", { expirationTtl: 20 });

    const next = (await plays(env)) + 1;
    await env.PLAYS.put("count", String(next));
    return json({ plays: next, counted: true });
  },
};
