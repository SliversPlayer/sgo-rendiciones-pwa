import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

describe('project configuration', () => {
  it('exposes reproducible validation scripts', async () => {
    const packageJson = await readJson('package.json');

    assert.equal(packageJson.scripts.typecheck, 'tsc -b');
    assert.match(packageJson.scripts.test, /typecheck/);
    assert.match(packageJson.scripts.test, /node --test/);
    assert.equal(packageJson.scripts['test:smoke:firebase'], 'node scripts/firebase-smoke.mjs');
  });

  it('configures Firebase Hosting as an SPA served from dist', async () => {
    const firebaseJson = await readJson('firebase.json');

    assert.equal(firebaseJson.hosting.public, 'dist');
    assert.deepEqual(firebaseJson.hosting.rewrites, [
      {
        source: '**',
        destination: '/index.html',
      },
    ]);

    const headerBySource = new Map(
      firebaseJson.hosting.headers.map((entry) => [entry.source, entry.headers]),
    );

    assert.match(
      headerBySource.get('/assets/**')[0].value,
      /immutable/,
      'hashed assets should be cached aggressively',
    );
    assert.match(
      headerBySource.get('/sw.js')[0].value,
      /no-cache/,
      'service worker should not be cached aggressively',
    );
  });

  it('keeps env template versionable without exposing local secrets', async () => {
    const gitignore = await readFile('.gitignore', 'utf8');
    const envExample = await readFile('.env.example', 'utf8');

    assert.match(gitignore, /^\.env\*/m);
    assert.match(gitignore, /^!\.env\.example$/m);
    assert.match(envExample, /^VITE_FIREBASE_API_KEY=$/m);
    assert.match(envExample, /^VITE_FIREBASE_APP_ID=$/m);
  });

  it('uses hashed build artifacts and explicit vendor chunks', async () => {
    const viteConfig = await readFile('vite.config.ts', 'utf8');

    assert.doesNotMatch(viteConfig, /entryFileNames:\s*['"]assets\/\[name\]\.js/);
    assert.doesNotMatch(viteConfig, /assetFileNames:\s*['"]assets\/\[name\]\[extname\]/);
    assert.match(viteConfig, /manualChunks/);
    assert.match(viteConfig, /firebase/);
    assert.match(viteConfig, /vendor/);
  });
});
