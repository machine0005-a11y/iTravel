# Joe's Japan Journey

A mobile-first Japan itinerary for Joe and his wife. 14 proposed days, 13 nights, Tokyo to Kyoto to Osaka, including Nara. No bookings, checkout, payment handling, tracking, or server-side storage. Dates and budget are unconfirmed; room sharing is an explicit assumption.

## Current deployment status

Built and offline-browser tested. NOT live as of this commit. The real GitHub Actions deployment attempt failed because this repository has neither `CLOUDFLARE_API_TOKEN` nor `CLOUDFLARE_ACCOUNT_ID` available to the workflow. A successful source commit is not a successful deployment. No public site URL has been verified.

The existing iTravel main branch and Vercel deployment remain unchanged. This standalone site lives on `joe-japan-cloudflare`. No other app, DNS record, account, or production service was modified.

## Publish in the owner's Cloudflare account

Use the existing Cloudflare account, not a new account or another hosting service. In Workers & Pages, choose Create application, then Import a repository. Connect/select GitHub account `machine0005-a11y` and repository `iTravel`.

Use these settings:

- Worker/project name: `joe-japan-trip`
- Production branch: `joe-japan-cloudflare`
- Root directory: `sites/joe-japan`
- Build command: `npm run check`
- Deploy command: `npx wrangler deploy`

The folder includes `package.json` and `wrangler.jsonc`. Cloudflare's build process installs the development dependency. The Worker serves only `public/`; source files, this README, and GitHub files are not part of the public site. Review the selected account and project, then Save and Deploy. After an actual successful deployment, open the provided workers.dev address and check the itinerary, date planner, and supplier links before sending it to Joe.

Official instructions: https://developers.cloudflare.com/workers/ci-cd/builds/
Build settings: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

Alternatively, make the two authorized Cloudflare values available as repository Actions secrets and rerun the `Joe Japan Cloudflare` workflow. Keep API tokens in the secret store, never chat, source code, URLs, or public logs. This is an alternative to the Cloudflare Git integration, not an additional requirement. The workflow fails explicitly on missing credentials and verifies HTTP 200 plus expected site content before printing a live URL.

## Local checks

`npm run check` validates JavaScript syntax without network access or installed dependencies. For local development with Wrangler: `npm install` then `npm run dev`. `npm run deploy` requires a properly authorized Cloudflare environment. Do not claim either command has completed remotely unless the actual output confirms it.

Offline Chromium QA covered room choices, 14 itinerary days, city filters, date arithmetic, plain-text request generation, clipboard/storage fallbacks, tentative calendar export, internal links, and responsive widths from 375 to 1440px. See TEST-RESULTS.txt for limitations. CSS, JavaScript, and HTML were verified against their Git blob hashes before commit.

## Privacy and travel limitations

Optional saved preferences stay in the browser's localStorage; sharing omits those entries. No-index headers and robots.txt discourage indexing but are not authentication. Anyone with the public URL can see the generic Joe-and-wife itinerary. There are no legal names, passport numbers, contact numbers, travel dates, or payment details embedded.

Supplier links are navigation, not reservations or live availability. The provider request requires an actual quote and traveler approval before secure payment. Calendar events are tentative and do not reserve anything. The source travel plan was reviewed September 12, 2026; recheck opening calendars, supplier policies, and hotel notices against the eventual dates.
