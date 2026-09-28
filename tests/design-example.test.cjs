const assert = require('node:assert/strict');
const test = require('node:test');
const { main } = require('../design.example.js');

test('missing key stops before any network request', async () => {
  let called = false;
  await assert.rejects(main({ apiKey: ' ', fetchImpl: async () => { called = true; }, log() {} }), /registered AIDC_API_KEY/);
  assert.equal(called, false);
});

test('key goes only in Authorization and sizing is read from summary', async () => {
  const output = [];
  const key = 'unit-test-key';
  const payload = { ok: true, rackCount: 999, summary: { rackCount: 7, pueDesign: 1.2, mvaTotal: 2 }, warnings: ['Planning only'], requestId: 'req_fixture', engineVersion: 'fixture' };
  const value = await main({
    apiKey: ` ${key} `, log: line => output.push(line),
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://aidc-ai.io/api/agent/design');
      assert.equal(options.headers.Authorization, `Bearer ${key}`);
      assert.equal(options.body.includes(key), false);
      return { ok: true, json: async () => payload };
    },
  });
  assert.equal(value, payload);
  assert.ok(output.includes('Rack count: 7'));
  assert.ok(output.includes('Warning: Planning only'));
  assert.ok(output.includes('Request ID: req_fixture'));
  assert.equal(output.join('\n').includes(key), false);
  assert.equal(output.join('\n').includes('999'), false);
});

test('HTTP failures and invalid success payloads cannot print a design', async () => {
  let lines = 0;
  for (const response of [
    { ok: false, status: 401 },
    { ok: true, json: async () => ({ ok: false, summary: {} }) },
    { ok: true, json: async () => ({ ok: true, summary: { rackCount: '7', pueDesign: 1.2, mvaTotal: 2 } }) },
  ]) {
    await assert.rejects(main({ apiKey: 'unit-test-key', fetchImpl: async () => response, log: () => { lines++; } }));
  }
  assert.equal(lines, 0);
});

test('network failure does not echo a credential-bearing underlying error', async () => {
  await assert.rejects(main({ apiKey: 'unit-test-key', fetchImpl: async () => { throw Error('unit-test-key'); }, log() {} }), error => {
    assert.doesNotMatch(error.message, /unit-test-key/);
    return true;
  });
});
