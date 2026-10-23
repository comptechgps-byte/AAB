const GITHUB_OWNER = "comptechgps-byte";
const GITHUB_REPOSITORY = "AAB";
const GITHUB_BRANCH = "main";
const CSV_PATH = "store.csv";
const CSV_HEADER = "Seat Number,Score";
const GITHUB_API = "https://api.github.com";
const MAX_ATTEMPTS = 3;
const ATTEMPT_STATE_KEY = "attempt-state";
const ADMIN_LOGIN_STATE_KEY = "admin-login-state";
const ADMIN_FAILURE_LIMIT = 5;
const ADMIN_LOCKOUT_MS = 15 * 60 * 1000;

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

function parseCsv(content) {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  if (lines.shift() !== CSV_HEADER) throw new Error("GitHub store.csv has an unexpected header.");
  return lines.filter(Boolean).map(function (line) {
    const [seatNumber, scoreText] = line.split(",", 2);
    const score = Number(scoreText);
    if (!/^\d+$/.test(seatNumber) || !Number.isFinite(score) || score < 0 || score > 25) {
      throw new Error("GitHub store.csv contains an invalid score row.");
    }
    return { seatNumber: seatNumber, score: score };
  });
}

function serializeCsv(rows) {
  return [CSV_HEADER].concat(rows.map(function (row) {
    return row.seatNumber + "," + row.score.toFixed(2);
  })).join("\r\n") + "\r\n";
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
  parseCsv(content);
  return { content: content, sha: file.sha };
}

async function writeCsv(token, transform, commitMessage) {
  const fileUrl = GITHUB_API + "/repos/" + GITHUB_OWNER + "/" + GITHUB_REPOSITORY +
    "/contents/" + encodeURIComponent(CSV_PATH);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await readCsvFile(token);
    const currentRows = parseCsv(existing && existing.content);
    const nextRows = await transform(currentRows);
    if (!existing && nextRows.length === 0) return;
    const nextContent = serializeCsv(nextRows);
    if (existing && nextContent === existing.content) return;

    const bytes = new TextEncoder().encode(nextContent);
    let binaryContent = "";
    bytes.forEach(function (byte) { binaryContent += String.fromCharCode(byte); });
    const body = {
      message: commitMessage || "Update quiz score results",
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
      console.error("GitHub PUT store.csv failed.", response.status, await response.text(),
        "needs:", response.headers.get("X-Accepted-GitHub-Permissions"));
      throw new Error("GitHub could not update store.csv (HTTP " + response.status + ").");
    }
  }
  throw new Error("GitHub could not update store.csv after concurrent changes; retry the save.");
}

function seatAttemptStore(env, seatNumber) {
  const id = env.SEAT_ATTEMPTS.idFromName(seatNumber);
  return env.SEAT_ATTEMPTS.get(id);
}

async function callAttemptStore(env, seatNumber, action, legacyScores, payload, authorized) {
  const response = await seatAttemptStore(env, seatNumber).fetch("https://seat-attempts/" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: action,
      legacyScores: legacyScores || [],
      payload: payload || null,
      authorized: authorized === true
    })
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || "Could not access the attempt record.");
    error.status = response.status;
    throw error;
  }
  return result;
}

async function migrateLegacyCsv(token, env) {
  await writeCsv(token, async function (rows) {
    if (rows.length === 0) return rows;
    const groupedScores = new Map();
    rows.forEach(function (row) {
      if (!groupedScores.has(row.seatNumber)) groupedScores.set(row.seatNumber, []);
      groupedScores.get(row.seatNumber).push(row.score);
    });

    const migratedRows = [];
    for (const [seatNumber, legacyScores] of groupedScores) {
      const summary = await callAttemptStore(env, seatNumber, "summary", legacyScores);
      if (summary.attemptCount >= MAX_ATTEMPTS) {
        migratedRows.push({ seatNumber: seatNumber, score: summary.bestScore });
      }
    }
    return migratedRows;
  });
}

export class SeatAttemptStore {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const { action, legacyScores, payload, authorized } = await request.json();
    if (action === "admin-login") {
      const now = Date.now();
      const result = await this.ctx.storage.transaction(async function (transaction) {
        let state = await transaction.get(ADMIN_LOGIN_STATE_KEY) || {
          failures: 0,
          windowStartedAt: now,
          lockedUntil: 0
        };
        if (state.lockedUntil > now) {
          return { status: 429, body: { error: "Admin login is temporarily locked. Try again later." } };
        }
        if (now - state.windowStartedAt >= ADMIN_LOCKOUT_MS) {
          state = { failures: 0, windowStartedAt: now, lockedUntil: 0 };
        }
        if (authorized) {
          state = { failures: 0, windowStartedAt: now, lockedUntil: 0 };
          await transaction.put(ADMIN_LOGIN_STATE_KEY, state);
          return { status: 200, body: { authorized: true } };
        }
        state.failures += 1;
        if (state.failures >= ADMIN_FAILURE_LIMIT) state.lockedUntil = now + ADMIN_LOCKOUT_MS;
        await transaction.put(ADMIN_LOGIN_STATE_KEY, state);
        return {
          status: state.lockedUntil > now ? 429 : 401,
          body: { error: state.lockedUntil > now
            ? "Admin login is temporarily locked. Try again later."
            : "Incorrect admin passcode." }
        };
      });
      return jsonResponse({ ...result.body, status: result.status }, 200, {});
    }
    if (action !== "summary" && action !== "record") {
      return new Response("Unknown action.", { status: 400 });
    }

    const result = await this.ctx.storage.transaction(async function (transaction) {
      let state = await transaction.get(ATTEMPT_STATE_KEY);
      if (!state) {
        state = {
          scores: Array.isArray(legacyScores) ? legacyScores : [],
          attemptIds: []
        };
      }

      let duplicate = false;
      if (action === "record") {
        if (!payload || typeof payload.attemptId !== "string" ||
            payload.attemptId.length < 1 || payload.attemptId.length > 100 ||
            typeof payload.score !== "number" || !Number.isFinite(payload.score) ||
            payload.score < 0 || payload.score > 25) {
          return { status: 400, body: { error: "Invalid score submission." } };
        }
        if (state.attemptIds.includes(payload.attemptId)) {
          duplicate = true;
        } else if (state.scores.length >= MAX_ATTEMPTS) {
          return { status: 409, body: { error: "This seat number has used all 3 attempts." } };
        } else {
          state.scores.push(payload.score);
          state.attemptIds.push(payload.attemptId);
        }
        await transaction.put(ATTEMPT_STATE_KEY, state);
      } else if (!(await transaction.get(ATTEMPT_STATE_KEY))) {
        await transaction.put(ATTEMPT_STATE_KEY, state);
      }

      return {
        status: 200,
        body: {
          attemptCount: state.scores.length,
          bestScore: state.scores.length ? Math.max.apply(null, state.scores) : null,
          finalized: state.scores.length >= MAX_ATTEMPTS,
          duplicate: duplicate
        }
      };
    });

    return jsonResponse(result.body, result.status, {});
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse({ error: "Request origin is not allowed." }, 403, {});
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Code",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "GET" && request.method !== "POST") {
      return jsonResponse({ error: "Use GET or POST." }, 405, corsHeaders);
    }
    if (!env.GITHUB_TOKEN) {
      return jsonResponse({ error: "The GitHub token is not configured on the score API." }, 503, corsHeaders);
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.searchParams.get("action") === "download") {
      if (!env.ADMIN_PASSCODE) {
        return jsonResponse({ error: "The admin passcode is not configured on the score API." }, 503, corsHeaders);
      }
      if (!env.SEAT_ATTEMPTS) {
        return jsonResponse({ error: "The seat attempt store is not configured." }, 503, corsHeaders);
      }
      const remoteAddress = request.headers.get("CF-Connecting-IP") || "unknown";
      let loginState;
      try {
        loginState = await callAttemptStore(
          env,
          "admin-login:" + remoteAddress,
          "admin-login",
          [],
          null,
          request.headers.get("X-Admin-Code") === env.ADMIN_PASSCODE
        );
      } catch (error) {
        console.error("Could not check admin login limits.", error);
        return jsonResponse({ error: error.message || "Could not verify admin access." }, 502, corsHeaders);
      }
      if (!loginState.authorized) {
        return jsonResponse({ error: loginState.error }, loginState.status, corsHeaders);
      }
      try {
        await migrateLegacyCsv(env.GITHUB_TOKEN, env);
        const file = await readCsvFile(env.GITHUB_TOKEN);
        const headers = new Headers(corsHeaders);
        headers.set("Content-Type", "text/csv;charset=UTF-8");
        headers.set("Content-Disposition", 'attachment; filename="store.csv"');
        headers.set("Cache-Control", "no-store");
        return new Response(file ? file.content : CSV_HEADER + "\r\n", { status: 200, headers: headers });
      } catch (error) {
        console.error("Could not download store.csv.", error);
        return jsonResponse({ error: error.message || "Could not download store.csv." }, 502, corsHeaders);
      }
    }

    if (request.method === "POST" && url.searchParams.get("action") === "clear") {
      if (!env.DELETE_PASSCODE) {
        return jsonResponse({ error: "The delete passcode is not configured on the score API." }, 503, corsHeaders);
      }
      if (!env.SEAT_ATTEMPTS) {
        return jsonResponse({ error: "The seat attempt store is not configured." }, 503, corsHeaders);
      }
      const remoteAddress = request.headers.get("CF-Connecting-IP") || "unknown";
      let loginState;
      try {
        loginState = await callAttemptStore(
          env,
          "admin-login:" + remoteAddress,
          "admin-login",
          [],
          null,
          request.headers.get("X-Admin-Code") === env.DELETE_PASSCODE
        );
      } catch (error) {
        console.error("Could not check admin login limits.", error);
        return jsonResponse({ error: error.message || "Could not verify admin access." }, 502, corsHeaders);
      }
      if (!loginState.authorized) {
        return jsonResponse({ error: loginState.error }, loginState.status, corsHeaders);
      }
      try {
        await writeCsv(env.GITHUB_TOKEN, async function () { return []; }, "Clear quiz score results");
        return jsonResponse({ cleared: true }, 200, corsHeaders);
      } catch (error) {
        console.error("Could not clear store.csv.", error);
        return jsonResponse({ error: error.message || "Could not clear store.csv." }, 502, corsHeaders);
      }
    }

    if (request.method === "GET") {
      const seatNumber = url.searchParams.get("seatNumber");
      if (!seatNumber || !/^\d+$/.test(seatNumber)) {
        return jsonResponse({ error: "Seat number must contain numbers only." }, 400, corsHeaders);
      }
      if (!env.SEAT_ATTEMPTS) {
        return jsonResponse({ error: "The seat attempt store is not configured." }, 503, corsHeaders);
      }
      try {
        await migrateLegacyCsv(env.GITHUB_TOKEN, env);
        const file = await readCsvFile(env.GITHUB_TOKEN);
        const legacyScores = parseCsv(file && file.content)
          .filter(function (row) { return row.seatNumber === seatNumber; })
          .map(function (row) { return row.score; });
        const summary = await callAttemptStore(env, seatNumber, "summary", legacyScores);
        if (summary.attemptCount < MAX_ATTEMPTS) {
          await writeCsv(env.GITHUB_TOKEN, async function (rows) {
            return rows.filter(function (row) { return row.seatNumber !== seatNumber; });
          });
        }
        return jsonResponse({
          attemptCount: summary.attemptCount,
          maxAttempts: MAX_ATTEMPTS
        }, 200, corsHeaders);
      } catch (error) {
        console.error("Could not check GitHub attempt count.", error);
        return jsonResponse({ error: error.message || "Could not check attempt count." }, 502, corsHeaders);
      }
    }

    if (!request.headers.get("Content-Type") ||
        !request.headers.get("Content-Type").toLowerCase().includes("application/json")) {
      return jsonResponse({ error: "Send the score as JSON." }, 415, corsHeaders);
    }
    if (!env.SEAT_ATTEMPTS) {
      return jsonResponse({ error: "The seat attempt store is not configured." }, 503, corsHeaders);
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
    if (typeof payload.attemptId !== "string" || payload.attemptId.length < 1 || payload.attemptId.length > 100) {
      return jsonResponse({ error: "Attempt ID is missing or invalid." }, 400, corsHeaders);
    }

    try {
      await migrateLegacyCsv(env.GITHUB_TOKEN, env);
      const file = await readCsvFile(env.GITHUB_TOKEN);
      const legacyScores = parseCsv(file && file.content)
        .filter(function (row) { return row.seatNumber === payload.seatNumber; })
        .map(function (row) { return row.score; });
      const result = await callAttemptStore(
        env, payload.seatNumber, "record", legacyScores, payload
      );
      if (result.attemptCount > MAX_ATTEMPTS) {
        return jsonResponse({ error: "This seat number has used all 3 attempts." }, 409, corsHeaders);
      }
      await writeCsv(env.GITHUB_TOKEN, async function (rows) {
        const updatedRows = rows.filter(function (row) { return row.seatNumber !== payload.seatNumber; });
        if (result.finalized) {
          updatedRows.push({ seatNumber: payload.seatNumber, score: result.bestScore });
        }
        return updatedRows;
      });
      return jsonResponse({
        saved: true,
        attemptCount: result.attemptCount,
        maxAttempts: MAX_ATTEMPTS,
        finalized: result.finalized,
        bestScore: result.finalized ? result.bestScore : null
      }, 200, corsHeaders);
    } catch (error) {
      console.error("GitHub score update failed.", error);
      return jsonResponse({ error: error.message || "Could not save the score." }, error.status || 502, corsHeaders);
    }
  }
};
