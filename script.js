const storeKey = "openaitpm.ideaArena.v1";

const state = {
  currentIdea: "",
  slug: "new",
  loops: 0,
  looping: false,
  memory: loadMemory()
};

const els = {
  form: document.querySelector("#ideaForm"),
  input: document.querySelector("#ideaInput"),
  repoInput: document.querySelector("#repoInput"),
  primaryModel: document.querySelector("#primaryModel"),
  routeStatus: document.querySelector("#routeStatus"),
  ideaTitle: document.querySelector("#ideaTitle"),
  loopButton: document.querySelector("#loopButton"),
  saveButton: document.querySelector("#saveButton"),
  clearButton: document.querySelector("#clearButton"),
  loopCount: document.querySelector("#loopCount"),
  ragScore: document.querySelector("#ragScore"),
  confidenceScore: document.querySelector("#confidenceScore"),
  memoryCount: document.querySelector("#memoryCount"),
  memoryList: document.querySelector("#memoryList"),
  codexOutput: document.querySelector("#codexOutput"),
  claudeOutput: document.querySelector("#claudeOutput"),
  codexScore: document.querySelector("#codexScore"),
  claudeScore: document.querySelector("#claudeScore"),
  winnerOutput: document.querySelector("#winnerOutput"),
  winnerLabel: document.querySelector("#winnerLabel")
};

function loadMemory() {
  try {
    return JSON.parse(localStorage.getItem(storeKey) || "[]");
  } catch {
    return [];
  }
}

function persistMemory() {
  localStorage.setItem(storeKey, JSON.stringify(state.memory.slice(0, 40)));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
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
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
}

function retrieve(idea) {
  const ideaTokens = tokens(idea);
  return state.memory
    .map((item) => {
      const overlap = [...tokens(item.idea)].filter((word) => ideaTokens.has(word)).length;
      return { ...item, overlap };
    })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 4);
}

function ideaSignals(idea) {
  const lower = idea.toLowerCase();
  const signals = [];
  if (lower.includes("viki") || lower.includes("meal") || lower.includes("nutrition")) signals.push("service concierge");
  if (lower.includes("text") || lower.includes("sms") || lower.includes("imessage")) signals.push("message-native intake");
  if (lower.includes("rag") || lower.includes("memory")) signals.push("retrieval loop");
  if (lower.includes("domain") || lower.includes("openaitpm")) signals.push("owned web surface");
  if (lower.includes("fitness") || lower.includes("trainer")) signals.push("fitness escalation");
  return signals.length ? signals : ["idea capture", "prototype", "operator workflow"];
}

function buildCodexPlan(idea, retrieved) {
  const signals = ideaSignals(idea);
  return [
    block("Route", `Create /idea/${state.slug} as the canonical workspace for this text. Every future revision appends to the same idea thread instead of scattering notes.`),
    block("Build", `Turn the input into a small working prototype: intake, arena comparison, saved snapshots, and a winner panel that can become the actual implementation brief.`),
    block("RAG", `Retrieve ${retrieved.length} related memory notes and use them as constraints. Signals: ${signals.join(", ")}.`),
    block("Next Code Hook", "Replace the local simulator with a server action that calls Codex 5.5, stores embeddings, then creates a pull request or deploy preview.")
  ].join("");
}

function buildClaudePlan(idea, retrieved) {
  const signals = ideaSignals(idea).reverse();
  return [
    block("Arena Critique", "Score the idea for clarity, speed to prototype, customer value, and operational risk before writing code."),
    block("User Flow", `Text comes in, gets normalized into an idea brief, retrieves related context, generates two competing plans, then keeps looping until a shippable artifact appears.`),
    block("Memory Fit", retrieved.length
      ? `Use nearby context from: ${retrieved.map((item) => item.title).join(", ")}.`
      : "No close saved memory yet, so this run becomes the seed document."),
    block("Guardrails", `Keep money, DNS, public launch, and real customer outreach behind explicit approval. Active signals: ${signals.join(", ")}.`)
  ].join("");
}

function block(title, body) {
  return `<section class="block"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></section>`;
}

function renderBlocks(blocks) {
  return blocks.map(([title, body]) => block(title, body)).join("");
}

function renderWinner(idea, retrieved, result) {
  const steps = result?.winner?.steps || [
    "Capture every text as an idea object with source text, slug, status, and loop count.",
    "Run an arena pass with Codex 5.5 and Claude Code 4.8 style outputs.",
    "Retrieve old idea snapshots by token overlap now, embeddings/vector DB later.",
    "Promote the winning answer into a build brief, prototype, or task queue item.",
    "Deploy behind aitpm.com/openaitpm.com with /idea/:slug fallback routing once DNS/hosting is approved."
  ];
  els.winnerOutput.innerHTML = `
    <section class="block">
      <h3>Decision</h3>
      <p>${escapeHtml(titleFromIdea(idea))} now has its own durable idea page and build loop.</p>
    </section>
    <section class="block">
      <h3>Loop</h3>
      <ul>${steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul>
    </section>
    <section class="block">
      <h3>RAG Status</h3>
      <p>${retrieved.length} related snapshots are feeding this run. The production version should swap this browser memory for embeddings plus durable storage.</p>
    </section>
  `;
}

function applyArena(idea, related = [], result = null, shouldPush = true) {
  state.currentIdea = idea.trim();
  if (!state.currentIdea) return;

  state.slug = slugify(state.currentIdea);
  if (!result) state.loops += 1;
  const retrieved = related.length ? related : retrieve(state.currentIdea);
  const confidence = result?.confidence || Math.min(96, 52 + retrieved.length * 8 + state.loops * 5);

  if (shouldPush) {
    history.pushState({}, "", `/idea/${state.slug}`);
  }

  els.routeStatus.textContent = `/idea/${state.slug}`;
  els.ideaTitle.textContent = titleFromIdea(state.currentIdea);
  els.loopCount.textContent = String(state.loops);
  els.ragScore.textContent = String(retrieved.length);
  els.confidenceScore.textContent = `${confidence}%`;
  els.codexOutput.innerHTML = result?.codex?.blocks ? renderBlocks(result.codex.blocks) : buildCodexPlan(state.currentIdea, retrieved);
  els.claudeOutput.innerHTML = result?.claude?.blocks ? renderBlocks(result.claude.blocks) : buildClaudePlan(state.currentIdea, retrieved);
  els.codexScore.textContent = `${result?.codex?.score || Math.min(99, confidence + 2)} pts`;
  els.claudeScore.textContent = `${result?.claude?.score || Math.min(99, confidence)} pts`;
  els.winnerLabel.textContent = result?.winner?.label || els.primaryModel.value;
  renderWinner(state.currentIdea, retrieved, result);
  renderMemory(retrieved);
}

async function runArena(idea, shouldPush = true) {
  state.currentIdea = idea.trim();
  if (!state.currentIdea) return;

  const requestedSlug = slugify(state.currentIdea);
  const payload = await api("/api/ideas", {
    method: "POST",
    body: JSON.stringify({
      idea: state.currentIdea,
      repoSource: els.repoInput.value,
      slug: requestedSlug,
      loops: state.loops
    })
  });

  const saved = payload.idea;
  state.slug = saved.slug;
  state.loops = saved.loops;
  state.memory = [saved, ...state.memory.filter((old) => old.slug !== saved.slug)].slice(0, 40);
  persistMemory();
  applyArena(saved.idea, saved.related || [], saved.result, shouldPush);
}

function saveSnapshot() {
  if (!state.currentIdea) return;
  const item = {
    id: crypto.randomUUID(),
    title: titleFromIdea(state.currentIdea),
    idea: state.currentIdea,
    slug: state.slug,
    loops: state.loops,
    createdAt: new Date().toISOString()
  };
  state.memory = [item, ...state.memory.filter((old) => old.idea !== item.idea)].slice(0, 40);
  persistMemory();
  renderMemory(retrieve(state.currentIdea));
}

function renderMemory(active = []) {
  els.memoryCount.textContent = `${state.memory.length} notes`;
  const activeIds = new Set(active.map((item) => item.id));
  const visible = state.memory.slice(0, 8);
  els.memoryList.innerHTML = visible.length
    ? visible.map((item) => `
      <button class="memory-item" data-id="${item.id}" type="button">
        ${activeIds.has(item.id) ? "Retrieved: " : ""}${escapeHtml(item.title)}
      </button>
    `).join("")
    : `<div class="memory-item">Saved idea snapshots will appear here and feed the retrieval loop.</div>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function startLoop() {
  if (!state.currentIdea) return;
  state.looping = true;
  els.loopButton.classList.add("active");
  els.loopButton.textContent = "Looping";
}

function stopLoop() {
  state.looping = false;
  els.loopButton.classList.remove("active");
  els.loopButton.textContent = "Start Loop";
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  state.loops = 0;
  runArena(els.input.value).catch((error) => {
    els.winnerOutput.innerHTML = block("Error", error.message);
  });
});

els.loopButton.addEventListener("click", () => {
  if (state.looping) {
    stopLoop();
    return;
  }
  startLoop();
});

els.saveButton.addEventListener("click", saveSnapshot);

els.clearButton.addEventListener("click", () => {
  stopLoop();
  state.currentIdea = "";
  state.slug = "new";
  state.loops = 0;
  els.input.value = "";
  history.pushState({}, "", "/");
  runInitial();
});

els.memoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  const item = state.memory.find((memory) => memory.id === button.dataset.id);
  if (!item) return;
  els.input.value = item.idea;
  els.repoInput.value = item.repoSource || "";
  state.loops = item.loops || 0;
  applyArena(item.idea, item.related || [], item.result);
});

setInterval(() => {
  if (!state.looping || !state.currentIdea) return;
  runArena(`${state.currentIdea}\nLoop ${state.loops + 1}: tighten the build brief and reduce ambiguity.`, false).catch((error) => {
    els.winnerOutput.innerHTML = block("Error", error.message);
  });
  saveSnapshot();
}, 4500);

window.addEventListener("popstate", runInitial);

async function runInitial() {
  const pathIdea = location.pathname.startsWith("/idea/")
    ? location.pathname.replace("/idea/", "").replace(/-/g, " ")
    : "";
  const seed = pathIdea || "Build an arena-style idea lab for openaitpm.com that turns any text into /idea pages, loops on the concept, and uses RAG memory.";
  els.input.value = seed;
  state.loops = 0;
  if (location.pathname.startsWith("/idea/")) {
    const slug = location.pathname.replace("/idea/", "");
    try {
      const payload = await api(`/api/ideas/${encodeURIComponent(slug)}`);
      const saved = payload.idea;
      els.input.value = saved.idea;
      els.repoInput.value = saved.repoSource || "";
      state.slug = saved.slug;
      state.loops = saved.loops || 0;
      applyArena(saved.idea, saved.related || [], saved.result, false);
      return;
    } catch {
      // Unknown slugs are still useful: treat the URL text as a fresh idea seed.
    }
  }
  runArena(seed, false).catch(() => applyArena(seed, [], null, false));
}

renderMemory();
runInitial();
