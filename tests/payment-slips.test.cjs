const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(results, configured = true) {
  const calls = [];
  const db = { from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const result = results.shift();
    const query = {
      select(value) { call.select = value; return this; }, order() { return this; },
      eq(...args) { call.filters.push(args); return this; },
      in() { return this; }, limit() { return this; },
      insert(value) { call.insert = value; return this; },
      maybeSingle() { return Promise.resolve(result); },
      single() { return Promise.resolve(result); },
      then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
    };
    return query;
  }};
  const exports = {};
  const source = fs.readFileSync('src/lib/payment-slips-server.ts', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, Buffer, process: { env: configured ? { SUPABASE_SERVICE_ROLE_KEY: 'test', NEXT_PUBLIC_SUPABASE_URL: 'https://example.test' } : {} },
    require(name) {
      if (name === '@supabase/supabase-js') return { createClient: () => db };
      if (name === '@/lib/supabase-relational') return { toUuid: id => 'uuid-' + id };
      if (name === '@/lib/slip-verification') return { validateImageSignature: () => ({ isValid: true, format: 'png' }) };
      return require(name);
    },
  });
  return { api: exports, calls };
}

test('stores original image bytes under the invoice branch and leaves payment pending', async () => {
  const { api, calls } = setup([{ data: { id: 'invoice-1' } }, { data: [] }, { data: { id: 'slip-1' } }]);
  const bytes = Buffer.from([0, 255, 128, 1, 0, 200]);
  assert.equal(await api.savePaymentSlip('branch-a', 'INV-1', bytes), 'slip-1');
  assert.equal(calls[0].select, 'id,rooms!inner(buildings!inner(property_id))');
  assert.ok(calls[0].filters.some(([key, value]) => key === 'rooms.buildings.property_id' && value === 'uuid-branch-a'));
  assert.deepEqual(api.decodeSlipImage(calls[2].insert.image_data), bytes);
  assert.equal(calls[2].insert.verification_status, 'pending');
  assert.equal(calls[2].insert.property_id, 'uuid-branch-a');
});

test('refuses images when invoice is absent from the requested branch', async () => {
  const { api, calls } = setup([{ data: null }, { data: { value: [] } }]);
  await assert.rejects(api.savePaymentSlip('branch-b', 'INV-1', Buffer.from('image')), e => e.status === 404);
  assert.equal(calls.length, 2);
});

test('legacy invoice requires an exact persisted branch and invoice ID', async () => {
  const { api, calls } = setup([
    { data: null }, { data: { value: [{ id: 'old-invoice', propertyId: 'branch-a', invoiceNumber: 'INV-1' }] } },
    { data: { id: 'uuid-old-invoice', rooms: null } }, { data: [] }, { data: { id: 'slip-1' } },
  ]);
  assert.equal(await api.savePaymentSlip('branch-a', 'INV-1', Buffer.from('image')), 'slip-1');
  assert.ok(calls[2].filters.some(([key, value]) => key === 'id' && value === 'uuid-old-invoice'));
});

test('legacy fallback refuses conflicting relational branch', async () => {
  const { api } = setup([
    { data: null }, { data: { value: [{ id: 'old-invoice', propertyId: 'branch-a', invoiceNumber: 'INV-1' }] } },
    { data: { id: 'uuid-old-invoice', rooms: { buildings: { property_id: 'uuid-branch-b' } } } },
  ]);
  await assert.rejects(api.savePaymentSlip('branch-a', 'INV-1', Buffer.from('image')), e => e.status === 404);
});

test('retry reuses an existing slip without inserting another image', async () => {
  const { api, calls } = setup([{ data: { id: 'invoice-1' } }, { data: [{ id: 'existing-slip' }] }]);
  assert.equal(await api.savePaymentSlip('branch-a', 'INV-1', Buffer.from('image')), 'existing-slip');
  assert.equal(calls.length, 2);
});

test('owner credentials cannot read another owners branch', async () => {
  const { api } = setup([
    { data: { id: 'owner-a', role: 'owner', is_active: true, phone: '0800000001', assigned_branch_ids: ['pwd:secret'] } },
    { data: [{ value: [{ id: 'branch-b', ownerId: 'owner-b', ownerPhone: '0800000002' }] }] },
  ]);
  const request = new Request('https://example.test', { headers: { authorization: 'Basic ' + Buffer.from('owner-a:secret').toString('base64') } });
  await assert.rejects(api.authorizeSlipRequest(request, 'branch-b'), e => e.status === 403);
});

test('missing server key and corrupt database image fail closed', () => {
  const { api } = setup([], false);
  assert.throws(() => api.slipDatabase(), e => e.status === 503);
  assert.throws(() => api.decodeSlipImage('\\x0zz'), e => e.status === 422);
});
