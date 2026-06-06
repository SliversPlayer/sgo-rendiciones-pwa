import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';

describe('Firebase security rules', () => {
  it('limits Storage uploads to the same attachment types accepted by the UI', async () => {
    const rules = await readFile('storage.rules', 'utf8');

    assert.match(rules, /request\.resource\.contentType == 'image\/jpeg'/);
    assert.match(rules, /request\.resource\.contentType == 'image\/png'/);
    assert.match(rules, /request\.resource\.contentType == 'application\/pdf'/);
    assert.doesNotMatch(rules, /contentType\.matches\('image\/\.\*'\)/);
  });

  it('blocks attachment writes and deletes when the parent rendicion is not editable', async () => {
    const rules = await readFile('storage.rules', 'utf8');

    assert.match(rules, /function isEditableRendicion\(rendicionId\)/);
    assert.match(rules, /rendicion\.estado in \['BORRADOR', 'RECHAZADA'\]/);
    assert.doesNotMatch(rules, /rendicion\.estado in \[[^\]]*ENVIANDO/);
    assert.doesNotMatch(rules, /rendicion\.estado in \[[^\]]*ERROR/);

    const createUpdateRule = rules.match(/allow create, update: if[\s\S]*?;/)?.[0] ?? '';
    const createRule = rules.match(/allow create: if[\s\S]*?;/)?.[0] ?? '';
    const updateRule = rules.match(/allow update: if[\s\S]*?;/)?.[0] ?? '';
    const deleteRule = rules.match(/allow delete: if[\s\S]*?;/)?.[0] ?? '';

    assert.equal(createUpdateRule, '');
    assert.match(createRule, /validUploadMetadata\(rendicionId, gastoId\)/);
    assert.match(updateRule, /validUploadMetadata\(rendicionId, gastoId\)/);
    assert.match(deleteRule, /canDeleteAdjunto\(rendicionId\)/);
    assert.match(rules, /function canDeleteAdjunto\(rendicionId\)/);
    assert.match(rules, /isEditableRendicion\(rendicionId\)/);
  });

  it('validates core Firestore rendicion and gasto payload fields', async () => {
    const rules = await readFile('firestore.rules', 'utf8');

    assert.match(rules, /function validRequiredString\(value\)/);
    assert.match(rules, /function validPositiveNumber\(value\)/);
    assert.match(rules, /function validNonNegativeNumber\(value\)/);
    assert.match(rules, /function validSentRendicionData\(data\)/);
    assert.match(rules, /function validAdjuntosPayload\(adjuntos\)/);
    assert.match(rules, /validRequiredString\(request\.resource\.data\.titulo\)/);
    assert.match(rules, /validRequiredString\(request\.resource\.data\.tipo_rendicion_id\)/);
    assert.match(rules, /validNonNegativeNumber\(request\.resource\.data\.total_gastos\)/);
    assert.match(rules, /validPositiveNumber\(data\.total_gastos\)/);
    assert.match(rules, /validPositiveNumber\(data\.monto_total\)/);
    assert.match(rules, /validRequiredString\(request\.resource\.data\.numero_documento\)/);
    assert.match(rules, /validPositiveNumber\(request\.resource\.data\.monto\)/);
    assert.match(rules, /validDownloadURL\(adjunto\.downloadURL\)/);
  });

  it('preserves least-privilege user and catalog writes', async () => {
    const rules = await readFile('firestore.rules', 'utf8');

    assert.match(rules, /allow list: if isSuperAdmin\(\);/);
    assert.match(rules, /allow delete: if false;/);
    assert.match(rules, /allow create: if isCatalogCollection\(catalogo\) && validCatalogWrite\(itemId, true\);/);
    assert.match(rules, /allow update: if isCatalogCollection\(catalogo\) && validCatalogWrite\(itemId, false\);/);
  });
});
