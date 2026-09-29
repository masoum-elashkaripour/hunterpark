## Stack

Next.js (App Router, `src/app`) + React, TypeScript, GSAP and Lenis for motion.

- Components in `src/components` render markup only (server components).
- Page behaviour lives in plain DOM scripts in `src/scripts`, started once by
  `src/components/SiteScripts.tsx` after hydration (`src/scripts/site.ts`).
- Styles are global CSS in `src/styles` (tokens, fonts, one file per component).
- Media: stills in `src/assets/media` (served through `next/image`), web-encoded
  films in `public/media`. Shared collection: `src/data/media.ts`.

## Development

```
npm run dev -- --port 3001 --hostname 0.0.0.0
```

Add `?preloader` to the URL to replay the preloader (it plays once per tab).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
