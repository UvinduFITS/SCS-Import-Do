// Vercel serverless function — serves the whole Express API under /api/*.
// The app is pre-bundled by scripts/build-api.mjs into ./_app.mjs.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated at build time (npm run build:api)
import app from './_app.mjs';

export default app;
