const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 4177);
const dataDir = process.env.OPENAITPM_DATA_DIR || path.join(root, "data");
const ideasFile = path.join(dataDir, "ideas.json");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store"
  });
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value, null, 2), "application/json; charset=utf-8");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(ideasFile)) {
    fs.writeFileSync(ideasFile, "[]\n");
  }
}

function loadIdeas() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(ideasFile, "utf8"));
  } catch {
    return [];
  }
}

function saveIdeas(ideas) {
  ensureStore();
  fs.writeFileSync(ideasFile, `${JSON.stringify(ideas.slice(0, 500), null, 2)}\n`);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "idea";
}

function titleFromIdea(idea) {
  const clean = idea.trim().replace(/\s+/g, " ");
  return clean.length > 64 ? `${clean.slice(0, 61)}...` : clean || "New Idea";
}

function tokens(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
}

function retrieve(idea, ideas) {
  const ideaTokens = tokens(idea);
  return ideas
    .map((item) => {
      const overlap = [...tokens(`${item.idea} ${item.repoSource || ""}`)].filter((word) => ideaTokens.has(word)).length;
      return { ...item, overlap };
    })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 6);
}

function ideaSignals(idea, repoSource) {
  const lower = `${idea} ${repoSource || ""}`.toLowerCase();
  const signals = [];
  if (lower.includes("viki") || lower.includes("meal") || lower.includes("nutrition")) signals.push("service concierge");
  if (lower.includes("text") || lower.includes("sms") || lower.includes("imessage")) signals.push("message-native intake");
  if (lower.includes("rag") || lower.includes("memory")) signals.push("retrieval loop");
  if (lower.includes("domain") || lower.includes("aitpm")) signals.push("owned domain surface");
  if (lower.includes("repo") || lower.includes("github") || lower.includes("check")) signals.push("repo check-in");
  if (lower.includes("fitness") || lower.includes("trainer")) signals.push("fitness escalation");
  return signals.length ? signals : ["idea capture", "prototype", "operator workflow"];
}

function buildArenaResult(idea, repoSource, retrieved, loops) {
  const signals = ideaSignals(idea, repoSource);
  const confidence = Math.min(96, 54 + retrieved.length * 6 + loops * 4);
  return {
    confidence,
    signals,
    codex: {
      score: Math.min(99, confidence + 2),
      blocks: [
        ["Route", `Create /idea/${slugify(idea)} as the canonical page for this idea text on aitpm.com/openaitpm.com.`],
        ["Build", "Generate a working web page, save the source idea, and keep each loop attached to the same artifact."],
        ["RAG", `Retrieve ${retrieved.length} related idea/check-in records and use them as constraints before generating the next page.`],
        ["Repo Hook", repoSource ? `Treat ${repoSource} as the code/repo source for future check-ins.` : "Attach a GitHub repo or code check-in when this moves from prototype to production."]
      ]
    },
    claude: {
      score: confidence,
      blocks: [
        ["Arena Critique", "Score the idea for clarity, speed, customer value, and operational risk before promoting it."],
        ["User Flow", "Text comes in, becomes an idea object, retrieves related memory, generates competing plans, then publishes a page."],
        ["Memory Fit", retrieved.length ? `Use nearby context from: ${retrieved.map((item) => item.title).join(", ")}.` : "No close saved memory yet, so this run becomes the seed document."],
        ["Guardrails", `Keep public DNS changes, customer outreach, and payment-related actions behind explicit approval. Signals: ${signals.join(", ")}.`]
      ]
    },
    winner: {
      label: "Codex 5.5 lane",
      steps: [
        "Capture every text as an idea object with source, slug, status, loop count, and repo/check-in pointer.",
        "Run the arena pass and persist the winning build brief.",
        "Use retrieved idea records now; swap in embeddings/vector search when production storage is connected.",
        "Serve the idea at /idea/:slug and deploy the app to aitpm.com/openaitpm.com through CI."
      ]
    }
  };
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/ideas") {
    sendJson(res, 200, { ideas: loadIdeas().slice(0, 50) });
    return true;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/ideas/")) {
    const slug = decodeURIComponent(url.pathname.replace("/api/ideas/", ""));
    const idea = loadIdeas().find((item) => item.slug === slug);
    sendJson(res, idea ? 200 : 404, idea ? { idea } : { error: "Idea not found" });
    return true;
  }

  if (req.method === "POST" && (url.pathname === "/api/ideas" || url.pathname === "/api/repo-checkin")) {
    const payload = JSON.parse(await readBody(req) || "{}");
    const ideaText = String(payload.idea || payload.text || "").trim();
    if (!ideaText) {
      sendJson(res, 400, { error: "Idea text is required" });
      return true;
    }

    const ideas = loadIdeas();
    const repoSource = String(payload.repoSource || payload.repo || "").trim();
    const slug = slugify(payload.slug || ideaText);
    const existing = ideas.find((item) => item.slug === slug);
    const loops = Number(payload.loops || existing?.loops || 0) + 1;
    const related = retrieve(ideaText, ideas.filter((item) => item.slug !== slug));
    const result = buildArenaResult(ideaText, repoSource, related, loops);
    const now = new Date().toISOString();
    const item = {
      id: existing?.id || randomUUID(),
      slug,
      title: titleFromIdea(ideaText),
      idea: ideaText,
      repoSource,
      source: url.pathname === "/api/repo-checkin" ? "repo-checkin" : "text",
      status: "generated",
      loops,
      related: related.map(({ id, slug, title, overlap }) => ({ id, slug, title, overlap })),
      result,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    saveIdeas([item, ...ideas.filter((old) => old.slug !== slug)]);
    sendJson(res, 200, { idea: item });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname.startsWith("/api/") && await handleApi(req, res, url)) {
      return;
    }
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
    return;
  }

  if (pathname === "/" || pathname.startsWith("/idea/")) {
    pathname = "/index.html";
  }

  const file = path.normalize(path.join(root, pathname));
  if (!file.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(file, (err, body) => {
    if (err) {
      send(res, 404, "Not found");
      return;
    }
    send(res, 200, body, types[path.extname(file)] || "application/octet-stream");
  });
});

server.listen(port, () => {
  console.log(`openaitpm idea arena running at http://localhost:${port}`);
});
