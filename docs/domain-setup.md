# Domain Setup

Production target: `aitpm.com` and/or `openaitpm.com`.

## Vercel

1. Create/link a Vercel project for this GitHub repo.
2. Set production environment variables:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - optional `OPENAITPM_CODEX_MODEL`
   - optional `OPENAITPM_CLAUDE_MODEL`
3. Add the production domains in Vercel:
   - `aitpm.com`
   - `www.aitpm.com`
   - `openaitpm.com`
   - `www.openaitpm.com`
4. Add `VERCEL_TOKEN` to GitHub Actions secrets.
5. Confirm DNS records from the registrar point to Vercel.

## App Routes

- `/` loads the idea arena.
- `/idea/:slug` loads a generated idea webpage.
- `POST /api/ideas` creates or updates an idea.
- `POST /api/repo-checkin` creates an idea from a repo/check-in source.

## Current State

The app is committed to GitHub. It will use real OpenAI and Anthropic calls when API keys are present, and deterministic local lanes when keys are missing.
