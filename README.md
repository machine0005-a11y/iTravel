# OpenAITPM / AITPM Idea Arena

Prototype for `aitpm.com/idea/...` and `openaitpm.com/idea/...`.

## What It Does

- Turns any rough text into a durable `/idea/:slug` webpage.
- Accepts a repo, PR, commit, or code check-in pointer with the idea.
- Runs an arena-style comparison between `Codex 5.5` and `Claude Code 4.8` labeled lanes.
- Saves server-side idea records in `data/ideas.json`.
- Retrieves related idea/check-in records as a lightweight RAG stand-in.
- Keeps looping while the loop toggle is active.

## Run

```bash
npm start
```

Then open:

```text
http://localhost:4177
```

## API

```bash
curl -X POST http://localhost:4177/api/ideas \
  -H 'content-type: application/json' \
  -d '{"idea":"turn any text into its own AITPM idea page","repoSource":"github.com/YOURNAME/YOURREPO"}'
```

Useful routes:

- `POST /api/ideas` - create or update an idea page.
- `POST /api/repo-checkin` - create an idea record from a repo/code check-in.
- `GET /api/ideas` - list recent ideas.
- `GET /api/ideas/:slug` - load a generated idea page record.
- `/idea/:slug` - browser page for the idea.

## Domain and Repo Flow

The intended production loop is:

1. Text idea or repo/check-in arrives.
2. App stores it as an idea record.
3. Arena pass generates a build brief.
4. `/idea/:slug` becomes the live page.
5. Push to `main` deploys to Vercel.
6. Vercel serves `aitpm.com` and/or `openaitpm.com`.

This repo includes:

- `vercel.json` for Node routing and `/idea/*` fallback.
- `.github/workflows/deploy.yml` for production deploys on `main`.

Required GitHub/Vercel secrets before the workflow can actually publish:

- `VERCEL_TOKEN`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- Vercel project linked to the GitHub repo
- Domain aliases configured in Vercel for `aitpm.com` and/or `openaitpm.com`

## Production Hooks Still Needed

Already wired:

- OpenAI lane through the Responses API when `OPENAI_API_KEY` exists.
- Anthropic lane through the Messages API when `ANTHROPIC_API_KEY` exists.
- Local deterministic fallback when either key is missing.

Environment model overrides:

- `OPENAITPM_CODEX_MODEL` defaults to `gpt-5.2`.
- `OPENAITPM_CLAUDE_MODEL` defaults to `claude-sonnet-4-5`.

Still needed for production-grade RAG:

- Embedding generation for every idea/check-in record.
- Vector store retrieval by idea id and user id.
- A durable database instead of local JSON storage.
