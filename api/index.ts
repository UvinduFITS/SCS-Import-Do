// Vercel serverless function — serves the whole Express API under /api/*.
// The app is pre-bundled by scripts/build-api.mjs into ./_app.mjs.
//
// vercel.json rewrites  /api/(.*) -> /api  so every API path is routed to THIS
// function; Express then matches on the original "/api/..." URL. (We use a plain
// "index" filename — NOT a "[...path]" catch-all — because the [ ] brackets are
// glob metacharacters in vercel.json's `functions` field and don't match the file.)
//
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated at build time (npm run build:api)
import app from './_app.mjs';

export default app;
