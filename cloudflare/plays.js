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

async function board(env) {
  try {
    const data = JSON.parse((await env.PLAYS.get("board")) || "[]");
    if (!Array.isArray(data)) return [];
    return data
      .filter((row) => row && Number.isFinite(row.score))
      .slice(0, 10)
      .map((row) => ({
        name: cleanName(row.name),
        score: Math.floor(row.score),
        gossips: Math.max(0, Math.floor(row.gossips) || 0),
      }));
  } catch {
    return [];
  }
}

function cleanName(value) {
  const name = String(value ?? "")
    .replace(/[^\p{L}\p{N} ._-]/gu, "")
    .trim()
    .slice(0, 16);
  return name || "Drběna";
}

function json(body, status = 200) {
  return Response.json(body, { status, headers });
}

async function snapshot(env) {
  return { plays: await plays(env), board: await board(env) };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/plays" && url.pathname !== "/score") return new Response("not found", { status: 404, headers });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method === "GET") return json(await snapshot(env));
    if (request.method !== "POST") return new Response("method", { status: 405, headers });

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (url.pathname === "/score") {
      const score = Math.floor(Number(body.score));
      const gossips = Math.floor(Number(body.gossips) || 0);
      if (!Number.isFinite(score) || score < 1 || score > 500000 || gossips < 0 || gossips > 9999) {
        return json(await snapshot(env));
      }
      const ip = request.headers.get("CF-Connecting-IP") || "anon";
      if (!(await env.PLAYS.get(`score:${ip}`))) {
        await env.PLAYS.put(`score:${ip}`, "1", { expirationTtl: 15 });
        const next = [...(await board(env)), { name: cleanName(body.name), score, gossips }];
        next.sort((a, b) => b.score - a.score || b.gossips - a.gossips);
        await env.PLAYS.put("board", JSON.stringify(next.slice(0, 10)));
      }
      return json(await snapshot(env));
    }

    const seconds = Number(body.seconds) || 0;
    if (seconds < 20 || seconds > 60 * 60) return json({ ...(await snapshot(env)), counted: false });
    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    if (await env.PLAYS.get(`lock:${ip}`)) return json({ ...(await snapshot(env)), counted: false });
    await env.PLAYS.put(`lock:${ip}`, "1", { expirationTtl: 20 });
    await env.PLAYS.put("count", String((await plays(env)) + 1));
    return json({ ...(await snapshot(env)), counted: true });
  },
};
