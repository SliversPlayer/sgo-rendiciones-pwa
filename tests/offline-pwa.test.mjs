import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';

describe('offline and PWA safeguards', () => {
  it('does not precache fixed Vite asset names in the service worker', async () => {
    const sw = await readFile('public/sw.js', 'utf8');

    assert.doesNotMatch(sw, /\/assets\/index\.js/);
    assert.doesNotMatch(sw, /\/assets\/index\.css/);
    assert.match(sw, /event\.request\.mode === 'navigate'/);
    assert.match(sw, /caches\.match\('\/index\.html'\)/);
    assert.match(sw, /status:\s*504/);
  });

  it('caches the authenticated user profile for offline reloads', async () => {
    const auth = await readFile('src/hooks/useAuth.tsx', 'utf8');

    assert.match(auth, /PROFILE_CACHE_KEY_PREFIX/);
    assert.match(auth, /function readCachedProfile\(user: User\)/);
    assert.match(auth, /function cacheProfile\(profile: UserProfile\)/);
    assert.match(auth, /cacheProfile\(profile\)/);
    assert.match(auth, /cacheProfile\(nextProfile\)/);
  });

  it('keeps the Firebase Auth session alive when profile loading fails offline', async () => {
    const auth = await readFile('src/hooks/useAuth.tsx', 'utf8');
    const fallbackIndex = auth.indexOf('const cachedProfile = readCachedProfile(user) ?? buildLocalProfile(user);');
    const offlineFallback = fallbackIndex >= 0 ? auth.slice(fallbackIndex, fallbackIndex + 260) : '';

    assert.match(offlineFallback, /readCachedProfile\(user\) \?\? buildLocalProfile\(user\)/);
    assert.match(offlineFallback, /setCurrentUser\(user\)/);
    assert.doesNotMatch(offlineFallback, /signOut\(firebaseAuth\)/);
  });
});
