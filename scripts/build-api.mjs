/**
 * Bundle the Express app (server/src/app.ts + @scs/shared) into a single
 * self-contained ESM file at api/_app.mjs, which the Vercel serverless function
 * (api/index.ts) imports. npm deps stay external — Vercel includes them from
 * node_modules. This avoids Vercel having to resolve the monorepo TypeScript.
 */

import * as esbuild from 'esbuild';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Resolve TS NodeNext-style `./foo.js` import specifiers to their `./foo.ts` source.
const jsToTs = {
  name: 'js-to-ts',
  setup(build) {
    build.onResolve({ filter: /^\.{1,2}\/.*\.js$/ }, (args) => {
      const ts = resolve(args.resolveDir, args.path.replace(/\.js$/, '.ts'));
      return existsSync(ts) ? { path: ts } : null;
    });
  },
};

await esbuild.build({
  entryPoints: [resolve(root, 'server/src/app.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: resolve(root, 'api/_app.mjs'),
  plugins: [jsToTs],
  // Keep npm packages external (loaded from node_modules at runtime). Only our own
  // source and @scs/shared are bundled.
  external: [
    'express',
    'cors',
    'dotenv',
    'dotenv/config',
    '@googleapis/sheets',
    'google-auth-library',
    'jsonwebtoken',
    'bcryptjs',
    'pdfkit',
    'uuid',
    'zod',
  ],
  banner: {
    js: "import { createRequire as _cr } from 'module'; const require = _cr(import.meta.url);",
  },
  logLevel: 'info',
});

console.log('✓ Built api/_app.mjs');
