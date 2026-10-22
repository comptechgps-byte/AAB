const GITHUB_OWNER = "comptechgps-byte";
const GITHUB_REPOSITORY = "AAB";
const GITHUB_BRANCH = "main";
const CSV_PATH = "store.csv";
const CSV_HEADER = "Seat Number,Score";
const GITHUB_API = "https://api.github.com";

function jsonResponse(payload, status, corsHeaders) {
  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json;charset=UTF-8");
  return new Response(JSON.stringify(payload), { status: status, headers: headers });
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "AAB-quiz-score-writer"
  };
}

async function readCsvFile(token) {
  const url = GITHUB_API + "/repos/" + GITHUB_OWNER + "/" + GITHUB_REPOSITORY +
    "/contents/" + encodeURIComponent(CSV_PATH) + "?ref=" + GITHUB_BRANCH;
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("GitHub could not read store.csv (HTTP " + response.status + ").");
  }

  const file = await response.json();
  const content = atob(String(file.content || "").replace(/\s/g, ""));
  if (content.split(/\r?\n/, 1)[0] !== CSV_HEADER) {
    throw new Error("GitHub store.csv has an unexpected header.");
  }
  return { content: content, sha: file.sha };
}

async function appendScore(token, seatNumber, score) {
  const fileUrl = GITHUB_API + "/repos/" + GITHUB_OWNER + "/" + GITHUB_REPOSITORY +
    "/contents/" + encodeURIComponent(CSV_PATH);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await readCsvFile(token);
    const nextContent = existing
      ? existing.content.replace(/\s*$/, "") + "\r\n" + seatNumber + "," + score.toFixed(2) + "\r\n"
      : CSV_HEADER + "\r\n" + seatNumber + "," + score.toFixed(2) + "\r\n";
    const bytes = new TextEncoder().encode(nextContent);
    let binaryContent = "";
    bytes.forEach(function (byte) { binaryContent += String.fromCharCode(byte); });

    const body = {
      message: "Add quiz score",
      content: btoa(binaryContent),
      branch: GITHUB_BRANCH
    };
    if (existing) body.sha = existing.sha;

    const response = await fetch(fileUrl, {
      method: "PUT",
      headers: githubHeaders(token),
      body: JSON.stringify(body)
    });
    if (response.ok) return;
    if (response.status !== 409 && response.status !== 422) {
      throw new Error("GitHub could not update store.csv (HTTP " + response.status + ").");
    }
  }
  throw new Error("GitHub could not update store.csv after concurrent changes; retry the save.");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse({ error: "Request origin is not allowed." }, 403, {});
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Use POST to submit a score." }, 405, corsHeaders);
    }
    if (!request.headers.get("Content-Type") || !request.headers.get("Content-Type").toLowerCase().includes("application/json")) {
      return jsonResponse({ error: "Send the score as JSON." }, 415, corsHeaders);
    }
    if (!env.GITHUB_TOKEN) {
      return jsonResponse({ error: "The GitHub token is not configured on the score API." }, 503, corsHeaders);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return jsonResponse({ error: "The request body must contain valid JSON." }, 400, corsHeaders);
    }
    if (!payload || typeof payload.seatNumber !== "string" || !/^\d+$/.test(payload.seatNumber)) {
      return jsonResponse({ error: "Seat number must contain numbers only." }, 400, corsHeaders);
    }
    if (typeof payload.score !== "number" || !Number.isFinite(payload.score) || payload.score < 0 || payload.score > 25) {
      return jsonResponse({ error: "Score must be a number from 0 to 25." }, 400, corsHeaders);
    }

    try {
      await appendScore(env.GITHUB_TOKEN, payload.seatNumber, payload.score);
      return jsonResponse({ saved: true }, 200, corsHeaders);
    } catch (error) {
      console.error("GitHub CSV update failed.", error);
      return jsonResponse({ error: error.message || "GitHub CSV update failed." }, 502, corsHeaders);
    }
  }
};
