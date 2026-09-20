# Doc2Ind — Manuscript Formatter for InDesign

A free, browser-based tool that cleans up and styles Word manuscripts for
Adobe InDesign. Upload a `.docx`, run automated cleanup, map paragraph and
character styles, preview the result with a live diff, and export a clean
Word document or InDesign Tagged Text — with unlimited exports, no accounts,
and no paywall. All document processing happens locally in the browser.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, Vite 7)
- Tailwind CSS v4 + shadcn/ui
- Client-side `.docx` parsing/building and Tagged Text export

## Local development

```bash
bun install        # or: npm install
bun run dev        # http://localhost:8080
```

Other scripts: `bun run build` (production build), `bun run preview`,
`bun run lint`, `bun run format`.

## Deploying to Vercel

The build auto-detects Vercel: when the `VERCEL` environment variable is
present, the server output switches to Nitro's `vercel` preset and emits a
zero-config [Build Output API](https://vercel.com/docs/build-output-api/v3)
bundle in `.vercel/output`.

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project → Import** the repo.
3. Leave all settings at their defaults (build command `vite build`,
   detected automatically). No environment variables are required.
4. Deploy.

Every push to the default branch then redeploys automatically.

## Deploying elsewhere

Without `VERCEL` set, `bun run build` produces a Cloudflare Workers bundle
(`dist/` + `wrangler.jsonc`) that can be deployed with Wrangler, or hosted
on Lovable via the Publish button.
