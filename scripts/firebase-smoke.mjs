import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const EXPECTED_USERS = [
  { email: 'superadmin@sgo.cl', role: 'SUPERADMIN', canListUsers: true },
  { email: 'admin@sgo.cl', role: 'ADMIN', canListUsers: false },
  { email: 'user@sgo.cl', role: 'USER', canListUsers: false },
];

function cleanEnvValue(value = '') {
  return value.trim().replace(/^"|"$/g, '');
}

async function loadFirebaseEnv() {
  const envFile = await readFile('.env', 'utf8');
  const env = {};

  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/);

    if (match) {
      env[match[1].trim()] = cleanEnvValue(match[2]);
    }
  }

  assert.ok(env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY is required in .env');
  assert.ok(env.VITE_FIREBASE_PROJECT_ID, 'VITE_FIREBASE_PROJECT_ID is required in .env');

  return env;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  const data = body ? JSON.parse(body) : null;

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function signIn(apiKey, email, password) {
  const result = await requestJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  assert.equal(result.ok, true, `${email} should authenticate successfully: ${result.data?.error?.message ?? result.status}`);
  assert.ok(result.data.localId, `${email} should return a uid`);
  assert.ok(result.data.idToken, `${email} should return an id token`);

  return result.data;
}

async function getDocument(projectId, path, token) {
  return requestJson(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

async function listCollection(projectId, collectionName, token, pageSize = 1) {
  return requestJson(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?pageSize=${pageSize}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

async function queryActiveCatalog(projectId, collectionName, token) {
  return requestJson(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'activo' },
              op: 'EQUAL',
              value: { booleanValue: true },
            },
          },
          limit: 1,
        },
      }),
    },
  );
}

function getStringField(document, fieldName) {
  return document?.fields?.[fieldName]?.stringValue;
}

function getBoolField(document, fieldName) {
  return document?.fields?.[fieldName]?.booleanValue;
}

async function run() {
  const password = process.env.SGO_SMOKE_PASSWORD;

  assert.ok(
    password,
    'Set SGO_SMOKE_PASSWORD before running npm run test:smoke:firebase',
  );

  const env = await loadFirebaseEnv();
  const results = [];

  for (const expected of EXPECTED_USERS) {
    const auth = await signIn(env.VITE_FIREBASE_API_KEY, expected.email, password);
    const profile = await getDocument(
      env.VITE_FIREBASE_PROJECT_ID,
      `usuarios/${auth.localId}`,
      auth.idToken,
    );

    assert.equal(profile.ok, true, `${expected.email} should read its own user profile`);
    assert.equal(getStringField(profile.data, 'email'), expected.email);
    assert.equal(getStringField(profile.data, 'rol'), expected.role);
    assert.equal(getBoolField(profile.data, 'activo'), true);

    const userList = await listCollection(
      env.VITE_FIREBASE_PROJECT_ID,
      'usuarios',
      auth.idToken,
    );

    if (expected.canListUsers) {
      assert.equal(userList.ok, true, `${expected.email} should list usuarios`);
    } else {
      assert.equal(userList.status, 403, `${expected.email} should not list usuarios`);
    }

    const catalogList = await queryActiveCatalog(
      env.VITE_FIREBASE_PROJECT_ID,
      'tipos_rendicion',
      auth.idToken,
    );

    assert.equal(
      catalogList.ok,
      true,
      `${expected.email} should read visible tipos_rendicion catalog items`,
    );

    results.push({
      email: expected.email,
      role: expected.role,
      ownProfile: 'ok',
      listUsuarios: expected.canListUsers ? 'allowed' : 'denied',
      listTiposRendicion: 'ok',
    });
  }

  console.table(results);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
